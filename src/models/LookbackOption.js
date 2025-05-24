import { MonteCarloSimulation } from './MonteCarloSimulation.js';

export class LookbackOption extends MonteCarloSimulation {
    constructor(params) {
        super(params);
        this.type = params.type || 'call';
        this.lookbackType = params.lookbackType || 'fixed'; // 'fixed' or 'floating'
    }

    calculatePrice(paths = null) {
        if (!paths) {
            paths = this.simulatePaths();
        }

        const payoffs = paths.map(path => {
            if (this.lookbackType === 'fixed') {
                // Fixed strike lookback
                if (this.type === 'call') {
                    const maxPrice = Math.max(...path);
                    return Math.max(maxPrice - this.K, 0);
                } else {
                    const minPrice = Math.min(...path);
                    return Math.max(this.K - minPrice, 0);
                }
            } else {
                // Floating strike lookback
                const finalPrice = path[path.length - 1];
                if (this.type === 'call') {
                    const minPrice = Math.min(...path);
                    return Math.max(finalPrice - minPrice, 0);
                } else {
                    const maxPrice = Math.max(...path);
                    return Math.max(maxPrice - finalPrice, 0);
                }
            }
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

    /**
     * Calculates the analytical price for continuous lookback options
     * @returns {number} Analytical lookback option price
     */
    calculateAnalyticalPrice() {
        const sigma2 = this.sigma * this.sigma;
        const root_T = Math.sqrt(this.T);
        const a = (this.r + 0.5 * sigma2) * this.T / (this.sigma * root_T);

        if (this.lookbackType === 'fixed') {
            if (this.type === 'call') {
                const d1 = Math.log(this.S0 / this.K) / (this.sigma * root_T) + a;
                const d2 = d1 - this.sigma * root_T;
                const e1 = (this.r + sigma2) * this.T / (this.sigma * root_T);
                const e2 = e1 - this.sigma * root_T;

                return this.S0 * this.normalCDF(d1) - 
                       this.K * Math.exp(-this.r * this.T) * this.normalCDF(d2) +
                       this.S0 * this.sigma * this.sigma * this.T / (2 * this.r) * 
                       (Math.exp(-this.r * this.T) * this.normalCDF(-d2) - 
                        this.normalCDF(-d1));
            } else {
                const d1 = Math.log(this.S0 / this.K) / (this.sigma * root_T) + a;
                const d2 = d1 - this.sigma * root_T;

                return this.K * Math.exp(-this.r * this.T) * this.normalCDF(-d2) - 
                       this.S0 * this.normalCDF(-d1) +
                       this.S0 * this.sigma * this.sigma * this.T / (2 * this.r) * 
                       (Math.exp(-this.r * this.T) * this.normalCDF(d2) - 
                        this.normalCDF(d1));
            }
        } else {
            // Floating strike lookback
            const q1 = (this.r + sigma2/2) * this.T / (this.sigma * root_T);
            const q2 = q1 - this.sigma * root_T;

            if (this.type === 'call') {
                return this.S0 * (
                    this.normalCDF(a) + 
                    this.sigma * root_T / 2 * 
                    (Math.exp(-this.r * this.T) * this.normalCDF(-q2) - 
                     this.normalCDF(-q1))
                );
            } else {
                return this.S0 * (
                    -this.normalCDF(-a) + 
                    this.sigma * root_T / 2 * 
                    (Math.exp(-this.r * this.T) * this.normalCDF(q2) - 
                     this.normalCDF(q1))
                );
            }
        }
    }

    /**
     * Implements continuous monitoring correction for lookback options
     * @param {object} result - Initial pricing result
     * @returns {object} Adjusted price
     */
    adjustForContinuousMonitoring(result) {
        const beta = 0.5826; // Broadie-Glasserman-Kou constant
        const h = this.T / this.steps;
        const adjustment = beta * this.sigma * Math.sqrt(h);

        const adjustedPayoffs = result.payoffs.map(payoff => 
            payoff * Math.exp(adjustment)
        );

        return {
            price: adjustedPayoffs.reduce((a, b) => a + b) / adjustedPayoffs.length,
            confidence: this.calculateConfidenceInterval(adjustedPayoffs),
            paths: result.paths,
            payoffs: adjustedPayoffs
        };
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