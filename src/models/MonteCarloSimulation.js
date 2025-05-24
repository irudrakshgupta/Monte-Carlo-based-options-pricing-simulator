import { cholesky } from '../utils/matrixOperations.js';

export class MonteCarloSimulation {
    constructor({
        spot,
        strike,
        volatility,
        riskFreeRate,
        maturity,
        steps,
        simulations,
        useAntithetic = true,
        useStratified = true,
        jumpDiffusion = false,
        type = 'call'
    }) {
        this.S0 = spot;
        this.K = strike;
        this.sigma = volatility;
        this.r = riskFreeRate;
        this.T = maturity;
        this.steps = steps;
        this.simulations = simulations;
        this.dt = this.T / this.steps;
        this.useAntithetic = useAntithetic;
        this.useStratified = useStratified;
        this.jumpDiffusion = jumpDiffusion;
        this.type = type;

        // Jump diffusion parameters (Merton model)
        if (jumpDiffusion) {
            this.lambda = 1.0;  // Jump intensity
            this.muJ = -0.1;    // Mean jump size
            this.sigmaJ = 0.2;  // Jump size volatility
        }
    }

    generateRandomNumbers() {
        const effectiveSimulations = this.useAntithetic ? Math.ceil(this.simulations / 2) : this.simulations;
        let z = new Array(effectiveSimulations);

        if (this.useStratified) {
            // Stratified sampling
            for (let i = 0; i < effectiveSimulations; i++) {
                const u = (i + Math.random()) / effectiveSimulations;
                z[i] = this.normalInverse(u);
            }
        } else {
            // Standard random sampling
            for (let i = 0; i < effectiveSimulations; i++) {
                z[i] = this.normalInverse(Math.random());
            }
        }

        if (this.useAntithetic) {
            // Double the array with antithetic variates
            const antithetic = z.map(x => -x);
            z = [...z, ...antithetic].slice(0, this.simulations);
        }

        return z;
    }

    simulatePaths() {
        const paths = new Array(this.simulations);
        const drift = (this.r - 0.5 * this.sigma * this.sigma) * this.dt;
        const diffusion = this.sigma * Math.sqrt(this.dt);

        for (let sim = 0; sim < this.simulations; sim++) {
            paths[sim] = new Array(this.steps + 1);
            paths[sim][0] = this.S0;

            for (let step = 0; step < this.steps; step++) {
                const z = this.generateRandomNumbers()[0];
                let movement = drift + diffusion * z;

                if (this.jumpDiffusion) {
                    const jumpOccurs = Math.random() < this.lambda * this.dt;
                    if (jumpOccurs) {
                        const jumpSize = this.muJ + this.sigmaJ * this.normalInverse(Math.random());
                        movement += jumpSize;
                    }
                }

                paths[sim][step + 1] = paths[sim][step] * Math.exp(movement);
            }
        }

        return paths;
    }

    calculateConfidenceInterval(prices) {
        const mean = prices.reduce((a, b) => a + b) / prices.length;
        const variance = prices.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (prices.length - 1);
        const stderr = Math.sqrt(variance / prices.length);
        const ci95 = 1.96 * stderr;

        return {
            mean,
            lower: mean - ci95,
            upper: mean + ci95
        };
    }

    normalInverse(p) {
        // Approximation of the inverse normal cumulative distribution
        // Acklam's algorithm
        const a1 = -39.6968302866538;
        const a2 = 220.946098424521;
        const a3 = -275.928510446969;
        const a4 = 138.357751867269;
        const a5 = -30.6647980661472;
        const a6 = 2.50662827745924;

        const b1 = -54.4760987982241;
        const b2 = 161.585836858041;
        const b3 = -155.698979859887;
        const b4 = 66.8013118877197;
        const b5 = -13.2806815528857;

        const c1 = -7.78489400243029E-03;
        const c2 = -0.322396458041136;
        const c3 = -2.40075827716184;
        const c4 = -2.54973253934373;
        const c5 = 4.37466414146497;
        const c6 = 2.93816398269878;

        const d1 = 7.78469570904146E-03;
        const d2 = 0.32246712907004;
        const d3 = 2.445134137143;
        const d4 = 3.75440866190742;

        const p_low = 0.02425;
        const p_high = 1 - p_low;

        let q, r;

        if (p < p_low) {
            q = Math.sqrt(-2 * Math.log(p));
            return (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
                   ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
        } else if (p <= p_high) {
            q = p - 0.5;
            r = q * q;
            return (((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q /
                   (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1);
        } else {
            q = Math.sqrt(-2 * Math.log(1 - p));
            return -(((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
                    ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
        }
    }

    calculateGreeks(paths) {
        const h = 0.01; // Small increment for finite difference
        
        // Base price
        const basePrice = this.calculatePrice(paths);

        // Delta: ∂V/∂S
        const spotUp = new MonteCarloSimulation({
            ...this,
            spot: this.S0 * (1 + h)
        });
        const spotDown = new MonteCarloSimulation({
            ...this,
            spot: this.S0 * (1 - h)
        });
        const delta = (spotUp.calculatePrice(spotUp.simulatePaths()) - 
                      spotDown.calculatePrice(spotDown.simulatePaths())) / (2 * h * this.S0);

        // Gamma: ∂²V/∂S²
        const gamma = (spotUp.calculatePrice(spotUp.simulatePaths()) - 
                      2 * basePrice +
                      spotDown.calculatePrice(spotDown.simulatePaths())) / (h * h * this.S0 * this.S0);

        // Theta: -∂V/∂t
        const thetaSim = new MonteCarloSimulation({
            ...this,
            maturity: this.T * (1 - h)
        });
        const theta = -(thetaSim.calculatePrice(thetaSim.simulatePaths()) - basePrice) / (h * this.T);

        // Vega: ∂V/∂σ
        const vegaSim = new MonteCarloSimulation({
            ...this,
            volatility: this.sigma * (1 + h)
        });
        const vega = (vegaSim.calculatePrice(vegaSim.simulatePaths()) - basePrice) / (h * this.sigma);

        // Rho: ∂V/∂r
        const rhoSim = new MonteCarloSimulation({
            ...this,
            riskFreeRate: this.r * (1 + h)
        });
        const rho = (rhoSim.calculatePrice(rhoSim.simulatePaths()) - basePrice) / (h * this.r);

        return { delta, gamma, theta, vega, rho };
    }

    calculateRiskMetrics(paths) {
        const prices = paths.map(path => path[path.length - 1]);
        const returns = prices.map(price => Math.log(price / this.S0));
        
        // Calculate Value at Risk (VaR)
        const sortedReturns = [...returns].sort((a, b) => a - b);
        const var95 = -sortedReturns[Math.floor(0.05 * returns.length)];
        
        // Calculate mean return and standard deviation
        const meanReturn = returns.reduce((a, b) => a + b) / returns.length;
        const stdDev = Math.sqrt(
            returns.reduce((a, b) => a + Math.pow(b - meanReturn, 2), 0) / (returns.length - 1)
        );
        
        // Calculate Sharpe Ratio (assuming risk-free rate as benchmark)
        const sharpeRatio = (meanReturn - this.r) / stdDev;
        
        // Calculate Sortino Ratio (using only negative returns)
        const negativeReturns = returns.filter(r => r < 0);
        const downstdDev = Math.sqrt(
            negativeReturns.reduce((a, b) => a + Math.pow(b, 2), 0) / negativeReturns.length
        );
        const sortinoRatio = (meanReturn - this.r) / downstdDev;
        
        return {
            var95,
            sharpeRatio,
            sortinoRatio
        };
    }

    calculatePrice(paths = null) {
        if (!paths) {
            paths = this.simulatePaths();
        }

        const payoffs = paths.map(path => {
            const finalPrice = path[path.length - 1];
            return this.type === 'call' 
                ? Math.max(finalPrice - this.K, 0)
                : Math.max(this.K - finalPrice, 0);
        });

        // Calculate present value
        const price = payoffs.reduce((a, b) => a + b) / payoffs.length * Math.exp(-this.r * this.T);
        const ci = this.calculateConfidenceInterval(payoffs.map(p => p * Math.exp(-this.r * this.T)));

        return {
            price,
            confidence: ci,
            paths,
            payoffs: payoffs.map(p => p * Math.exp(-this.r * this.T))
        };
    }
} 