import { MonteCarloSimulation } from './MonteCarloSimulation.js';

export class BarrierOption extends MonteCarloSimulation {
    constructor(params) {
        super(params);
        this.type = params.type || 'call';
        this.barrierType = params.barrierType || 'up-and-out';
        this.barrier = params.barrier || this.K * 1.2; // Default barrier 20% above strike for up options
        
        // Validate barrier level based on barrier type
        if (this.barrierType.startsWith('up') && this.barrier <= this.S0) {
            throw new Error('Up barrier must be above spot price');
        }
        if (this.barrierType.startsWith('down') && this.barrier >= this.S0) {
            throw new Error('Down barrier must be below spot price');
        }
    }

    calculatePrice(paths = null) {
        if (!paths) {
            paths = this.simulatePaths();
        }

        const payoffs = paths.map(path => {
            // Check if barrier is hit
            const isBarrierHit = this.checkBarrierHit(path);
            
            // Calculate final payoff based on barrier condition
            let payoff = 0;
            const finalPrice = path[path.length - 1];

            if (this.barrierType.endsWith('out')) {
                // Out options pay nothing if barrier is hit
                if (!isBarrierHit) {
                    payoff = this.type === 'call'
                        ? Math.max(finalPrice - this.K, 0)
                        : Math.max(this.K - finalPrice, 0);
                }
            } else {
                // In options pay only if barrier is hit
                if (isBarrierHit) {
                    payoff = this.type === 'call'
                        ? Math.max(finalPrice - this.K, 0)
                        : Math.max(this.K - finalPrice, 0);
                }
            }

            return payoff;
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

    checkBarrierHit(path) {
        if (this.barrierType.startsWith('up')) {
            // Check if price ever goes above barrier
            return path.some(price => price >= this.barrier);
        } else {
            // Check if price ever goes below barrier
            return path.some(price => price <= this.barrier);
        }
    }

    /**
     * Implements continuous barrier monitoring correction
     * Uses Broadie-Glasserman-Kou adjustment
     * @param {object} result - Initial pricing result
     * @returns {object} Adjusted price
     */
    adjustForContinuousBarrier(result) {
        const beta = 0.5826; // Constant from Broadie-Glasserman-Kou paper
        const h = this.T / this.steps; // Time step
        
        // Calculate barrier adjustment
        const adjustment = beta * this.sigma * Math.sqrt(h);
        
        // Adjust barrier level based on option type
        const adjustedBarrier = this.barrierType.startsWith('up')
            ? this.barrier * Math.exp(-adjustment)
            : this.barrier * Math.exp(adjustment);

        // Reprice with adjusted barrier
        const tempBarrier = this.barrier;
        this.barrier = adjustedBarrier;
        const adjustedResult = this.calculatePrice(result.paths);
        this.barrier = tempBarrier;

        return adjustedResult;
    }

    /**
     * Calculates the analytical price for simple barrier options
     * Only valid for standard up-and-out or down-and-out calls/puts
     * @returns {number} Analytical barrier option price
     */
    calculateAnalyticalPrice() {
        const sigma2 = this.sigma * this.sigma;
        const mu = this.r - 0.5 * sigma2;
        const root_T = Math.sqrt(this.T);
        
        const x1 = Math.log(this.S0 / this.K) / (this.sigma * root_T) + 
                   (mu + sigma2) * root_T / this.sigma;
        const x2 = Math.log(this.S0 / this.barrier) / (this.sigma * root_T) + 
                   (mu + sigma2) * root_T / this.sigma;
        const y1 = Math.log(this.barrier * this.barrier / (this.S0 * this.K)) / 
                   (this.sigma * root_T) + (mu + sigma2) * root_T / this.sigma;
        const y2 = Math.log(this.barrier / this.S0) / (this.sigma * root_T) + 
                   (mu + sigma2) * root_T / this.sigma;

        const lambda = (mu + sigma2) / sigma2;
        const z = Math.log(this.barrier / this.S0) / (this.sigma * root_T) + lambda * this.sigma * root_T;

        if (this.type === 'call' && this.barrierType === 'up-and-out') {
            return this.S0 * Math.exp(-this.r * this.T) * (
                this.normalCDF(x1) - 
                this.normalCDF(x2) - 
                Math.pow(this.barrier / this.S0, 2 * lambda) * (
                    this.normalCDF(-y1) - this.normalCDF(-y2)
                )
            );
        } else if (this.type === 'put' && this.barrierType === 'down-and-out') {
            return this.K * Math.exp(-this.r * this.T) * this.normalCDF(-x1 + this.sigma * root_T) - 
                   this.S0 * this.normalCDF(-x1) - 
                   this.K * Math.exp(-this.r * this.T) * Math.pow(this.barrier / this.S0, 2 * lambda) * 
                   this.normalCDF(z) + 
                   this.S0 * Math.pow(this.barrier / this.S0, 2 * lambda - 2) * 
                   this.normalCDF(z - this.sigma * root_T);
        }

        throw new Error('Analytical solution only available for up-and-out calls and down-and-out puts');
    }

    /**
     * Calculates the cumulative distribution function for standard normal
     * @param {number} x - Input value
     * @returns {number} CDF value
     */
    normalCDF(x) {
        const t = 1 / (1 + 0.2316419 * Math.abs(x));
        const d = 0.3989423 * Math.exp(-x * x / 2);
        const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
        return x > 0 ? 1 - p : p;
    }
} 