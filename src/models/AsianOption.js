import { MonteCarloSimulation } from './MonteCarloSimulation.js';

export class AsianOption extends MonteCarloSimulation {
    constructor(params) {
        super(params);
        this.type = params.type || 'call';
        this.averageType = params.averageType || 'arithmetic';
    }

    calculatePrice(paths = null) {
        if (!paths) {
            paths = this.simulatePaths();
        }

        const payoffs = paths.map(path => {
            // Calculate average price
            const average = this.averageType === 'arithmetic'
                ? path.reduce((a, b) => a + b) / path.length
                : Math.exp(path.reduce((a, b) => a + Math.log(b)) / path.length);

            // Calculate payoff based on option type
            if (this.type === 'call') {
                return Math.max(average - this.K, 0);
            } else {
                return Math.max(this.K - average, 0);
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
     * Calculates the control variate estimate using geometric average as control
     * @param {number[][]} paths - Simulated price paths
     * @returns {object} Price estimate with reduced variance
     */
    calculateControlVariate(paths) {
        const arithmeticPayoffs = paths.map(path => {
            const arithmeticAvg = path.reduce((a, b) => a + b) / path.length;
            return this.type === 'call'
                ? Math.max(arithmeticAvg - this.K, 0)
                : Math.max(this.K - arithmeticAvg, 0);
        });

        const geometricPayoffs = paths.map(path => {
            const geometricAvg = Math.exp(path.reduce((a, b) => a + Math.log(b)) / path.length);
            return this.type === 'call'
                ? Math.max(geometricAvg - this.K, 0)
                : Math.max(this.K - geometricAvg, 0);
        });

        // Calculate geometric average option price analytically
        const geometricPrice = this.calculateGeometricPrice();

        // Calculate control variate coefficient
        const covXY = this.calculateCovariance(arithmeticPayoffs, geometricPayoffs);
        const varY = this.calculateVariance(geometricPayoffs);
        const beta = covXY / varY;

        // Apply control variate adjustment
        const adjustedPayoffs = arithmeticPayoffs.map((x, i) => 
            x - beta * (geometricPayoffs[i] - geometricPrice)
        );

        const price = adjustedPayoffs.reduce((a, b) => a + b) / adjustedPayoffs.length * Math.exp(-this.r * this.T);
        const ci = this.calculateConfidenceInterval(adjustedPayoffs.map(p => p * Math.exp(-this.r * this.T)));

        return {
            price,
            confidence: ci,
            paths,
            payoffs: adjustedPayoffs.map(p => p * Math.exp(-this.r * this.T))
        };
    }

    /**
     * Calculates the analytical price for geometric average Asian option
     * @returns {number} Geometric Asian option price
     */
    calculateGeometricPrice() {
        const n = this.steps + 1;
        const sigma_adj = this.sigma * Math.sqrt((n + 1) * (2 * n + 1) / (6 * n * n));
        const mu_adj = (this.r - 0.5 * this.sigma * this.sigma) * (n + 1) / (2 * n) + 
                      0.5 * sigma_adj * sigma_adj;

        const d1 = (Math.log(this.S0 / this.K) + (mu_adj + 0.5 * sigma_adj * sigma_adj) * this.T) / 
                   (sigma_adj * Math.sqrt(this.T));
        const d2 = d1 - sigma_adj * Math.sqrt(this.T);

        if (this.type === 'call') {
            return this.S0 * Math.exp((mu_adj - this.r) * this.T) * this.normalCDF(d1) - 
                   this.K * Math.exp(-this.r * this.T) * this.normalCDF(d2);
        } else {
            return this.K * Math.exp(-this.r * this.T) * this.normalCDF(-d2) - 
                   this.S0 * Math.exp((mu_adj - this.r) * this.T) * this.normalCDF(-d1);
        }
    }

    /**
     * Calculates the covariance between two arrays
     * @param {number[]} x - First array
     * @param {number[]} y - Second array
     * @returns {number} Covariance
     */
    calculateCovariance(x, y) {
        const n = x.length;
        const meanX = x.reduce((a, b) => a + b) / n;
        const meanY = y.reduce((a, b) => a + b) / n;
        
        return x.reduce((sum, xi, i) => 
            sum + (xi - meanX) * (y[i] - meanY), 0
        ) / (n - 1);
    }

    /**
     * Calculates the variance of an array
     * @param {number[]} x - Input array
     * @returns {number} Variance
     */
    calculateVariance(x) {
        const n = x.length;
        const mean = x.reduce((a, b) => a + b) / n;
        
        return x.reduce((sum, xi) => 
            sum + Math.pow(xi - mean, 2), 0
        ) / (n - 1);
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