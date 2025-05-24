import { AsianOption } from './models/AsianOption.js';
import { BarrierOption } from './models/BarrierOption.js';
import { LookbackOption } from './models/LookbackOption.js';
import * as d3 from 'd3';
import Plotly from 'plotly.js-dist';

// UI Elements
const optionType = document.getElementById('optionType');
const spot = document.getElementById('spot');
const strike = document.getElementById('strike');
const volatility = document.getElementById('volatility');
const riskFreeRate = document.getElementById('riskFreeRate');
const maturity = document.getElementById('maturity');
const steps = document.getElementById('steps');
const simulations = document.getElementById('simulations');
const useAntithetic = document.getElementById('useAntithetic');
const useStratified = document.getElementById('useStratified');
const jumpDiffusion = document.getElementById('jumpDiffusion');
const calculateButton = document.getElementById('calculateButton');
const darkModeToggle = document.getElementById('darkModeToggle');

// Theme handling
let isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');

darkModeToggle.addEventListener('click', () => {
    isDarkMode = !isDarkMode;
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
    updateChartTheme();
});

// Chart configuration
const chartConfig = {
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['lasso2d', 'select2d']
};

// Initialize charts
function initializeCharts() {
    // Path chart
    Plotly.newPlot('pathChart', [{
        y: [],
        type: 'scatter',
        mode: 'lines',
        name: 'Asset Path'
    }], {
        title: 'Sample Price Paths',
        xaxis: { title: 'Time Step' },
        yaxis: { title: 'Price' },
        template: isDarkMode ? 'plotly_dark' : 'plotly_white'
    }, chartConfig);

    // Payoff histogram
    Plotly.newPlot('payoffHistogram', [{
        x: [],
        type: 'histogram',
        name: 'Payoff Distribution'
    }], {
        title: 'Payoff Distribution',
        xaxis: { title: 'Payoff' },
        yaxis: { title: 'Frequency' },
        template: isDarkMode ? 'plotly_dark' : 'plotly_white'
    }, chartConfig);
}

function updateChartTheme() {
    const template = isDarkMode ? 'plotly_dark' : 'plotly_white';
    
    Plotly.update('pathChart', {}, { template });
    Plotly.update('payoffHistogram', {}, { template });
}

// Create option instance based on type
function createOption(params) {
    const [baseType, subType] = params.optionType.split('-');
    
    switch(baseType) {
        case 'asian':
            return new AsianOption({
                ...params,
                type: subType
            });
        case 'barrier':
            return new BarrierOption({
                ...params,
                type: subType.endsWith('call') ? 'call' : 'put',
                barrierType: subType.replace(/(call|put)$/, '')
            });
        case 'lookback':
            return new LookbackOption({
                ...params,
                lookbackType: subType
            });
        default:
            throw new Error('Invalid option type');
    }
}

// Update UI with pricing results
function updateResults(result) {
    // Update price display
    const priceElement = document.getElementById('optionPrice');
    priceElement.innerHTML = `
        <h3>Option Price</h3>
        <p class="price">${result.price.toFixed(4)}</p>
        <p class="confidence">95% CI: [${result.confidence.lower.toFixed(4)}, ${result.confidence.upper.toFixed(4)}]</p>
    `;

    // Update path chart
    const paths = result.paths.slice(0, 10); // Show first 10 paths
    const pathData = paths.map(path => ({
        y: path,
        type: 'scatter',
        mode: 'lines',
        opacity: 0.6
    }));

    Plotly.newPlot('pathChart', pathData, {
        title: 'Sample Price Paths',
        xaxis: { title: 'Time Step' },
        yaxis: { title: 'Price' },
        template: isDarkMode ? 'plotly_dark' : 'plotly_white'
    }, chartConfig);

    // Update payoff histogram
    Plotly.newPlot('payoffHistogram', [{
        x: result.payoffs,
        type: 'histogram',
        name: 'Payoff Distribution',
        nbinsx: 50
    }], {
        title: 'Payoff Distribution',
        xaxis: { title: 'Payoff' },
        yaxis: { title: 'Frequency' },
        template: isDarkMode ? 'plotly_dark' : 'plotly_white'
    }, chartConfig);

    // Update Greeks
    const greeks = result.greeks;
    Object.entries(greeks).forEach(([greek, value]) => {
        const element = document.getElementById(greek);
        element.innerHTML = `
            <h4>${greek.toUpperCase()}</h4>
            <p>${value.toFixed(4)}</p>
        `;
    });

    // Update risk metrics
    const metrics = result.riskMetrics;
    document.getElementById('var').innerHTML = `
        <h4>VaR (95%)</h4>
        <p>${metrics.var95.toFixed(4)}</p>
    `;
    document.getElementById('sharpeRatio').innerHTML = `
        <h4>Sharpe Ratio</h4>
        <p>${metrics.sharpeRatio.toFixed(4)}</p>
    `;
    document.getElementById('sortinoRatio').innerHTML = `
        <h4>Sortino Ratio</h4>
        <p>${metrics.sortinoRatio.toFixed(4)}</p>
    `;
}

// Main calculation handler
async function calculateOption() {
    calculateButton.disabled = true;
    calculateButton.textContent = 'Calculating...';
    
    // Clear previous results
    document.getElementById('optionPrice').innerHTML = '<h3>Option Price</h3><p>Calculating...</p>';
    document.getElementById('pathChart').innerHTML = '';
    document.getElementById('payoffHistogram').innerHTML = '';
    
    try {
        console.log('Starting calculation...');
        
        const params = {
            optionType: optionType.value,
            spot: parseFloat(spot.value),
            strike: parseFloat(strike.value),
            volatility: parseFloat(volatility.value),
            riskFreeRate: parseFloat(riskFreeRate.value),
            maturity: parseFloat(maturity.value),
            steps: parseInt(steps.value),
            simulations: parseInt(simulations.value),
            useAntithetic: useAntithetic.checked,
            useStratified: useStratified.checked,
            jumpDiffusion: jumpDiffusion.checked
        };

        console.log('Parameters:', params);

        // Validate parameters
        if (isNaN(params.spot) || params.spot <= 0) throw new Error('Invalid spot price');
        if (isNaN(params.strike) || params.strike <= 0) throw new Error('Invalid strike price');
        if (isNaN(params.volatility) || params.volatility <= 0) throw new Error('Invalid volatility');
        if (isNaN(params.riskFreeRate)) throw new Error('Invalid risk-free rate');
        if (isNaN(params.maturity) || params.maturity <= 0) throw new Error('Invalid maturity');
        if (isNaN(params.steps) || params.steps <= 0) throw new Error('Invalid number of steps');
        if (isNaN(params.simulations) || params.simulations <= 0) throw new Error('Invalid number of simulations');

        return new Promise((resolve, reject) => {
            // Use Web Worker for computation
            const worker = new Worker(new URL('./workers/pricingWorker.js', import.meta.url), {
                type: 'module'
            });
            
            // Set a timeout to prevent infinite calculation
            const timeout = setTimeout(() => {
                worker.terminate();
                reject(new Error('Calculation timeout after 30 seconds'));
            }, 30000);
            
            worker.onerror = function(e) {
                clearTimeout(timeout);
                console.error('Worker error:', e);
                reject(new Error('Error in calculation worker: ' + e.message));
            };
            
            worker.onmessage = function(e) {
                clearTimeout(timeout);
                console.log('Received result from worker:', e.data);
                
                if (e.data.error) {
                    console.error('Calculation error:', e.data);
                    reject(new Error(e.data.error));
                } else {
                    resolve(e.data);
                }
                
                worker.terminate();
            };

            console.log('Posting message to worker...');
            worker.postMessage({
                params,
                optionType: optionType.value
            });
        })
        .then(result => {
            console.log('Updating UI with results...');
            updateResults(result);
        })
        .catch(error => {
            console.error('Calculation failed:', error);
            alert('Error calculating option price: ' + error.message);
        })
        .finally(() => {
            calculateButton.disabled = false;
            calculateButton.textContent = 'Calculate Price';
        });

    } catch (error) {
        console.error('Calculation error:', error);
        alert('Error calculating option price: ' + error.message);
        calculateButton.disabled = false;
        calculateButton.textContent = 'Calculate Price';
    }
}

// Event listeners
calculateButton.addEventListener('click', calculateOption);
window.addEventListener('load', initializeCharts);

// Handle option type changes
optionType.addEventListener('change', () => {
    const [baseType, subType] = optionType.value.split('-');
    
    // Show/hide barrier input if needed
    const barrierInput = document.querySelector('.barrier-input');
    if (baseType === 'barrier') {
        if (!barrierInput) {
            const div = document.createElement('div');
            div.className = 'param-group barrier-input';
            div.innerHTML = `
                <label for="barrier">Barrier Level:</label>
                <input type="number" id="barrier" value="${parseFloat(spot.value) * 1.2}" step="0.01">
            `;
            strike.parentElement.after(div);
        }
    } else {
        if (barrierInput) {
            barrierInput.remove();
        }
    }
});

// Export for testing
export { createOption, updateResults }; 