import { AsianOption } from '../models/AsianOption.js';
import { BarrierOption } from '../models/BarrierOption.js';
import { LookbackOption } from '../models/LookbackOption.js';

self.onmessage = function(e) {
    try {
        const { params, optionType } = e.data;
        console.log('Worker started with params:', params);
        console.log('Option type:', optionType);

        // Create option instance
        const option = createOption(params);
        console.log('Option instance created successfully');

        // Calculate price and metrics
        console.log('Starting path simulation...');
        const paths = option.simulatePaths();
        console.log(`Generated ${paths.length} paths`);

        console.log('Calculating price...');
        const result = option.calculatePrice(paths);
        console.log('Price calculated:', result.price);

        console.log('Calculating Greeks...');
        const greeks = option.calculateGreeks(paths);
        console.log('Greeks:', greeks);

        console.log('Calculating risk metrics...');
        const riskMetrics = option.calculateRiskMetrics(paths);
        console.log('Risk metrics:', riskMetrics);

        // Apply continuous monitoring correction if applicable
        let finalResult = result;
        if (optionType.startsWith('barrier')) {
            console.log('Applying barrier correction...');
            finalResult = option.adjustForContinuousBarrier(result);
        } else if (optionType.startsWith('lookback')) {
            console.log('Applying lookback correction...');
            finalResult = option.adjustForContinuousMonitoring(result);
        }

        console.log('Sending results back to main thread...');
        self.postMessage({
            ...finalResult,
            greeks,
            riskMetrics
        });
        console.log('Results sent successfully');

    } catch (error) {
        console.error('Worker error:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        self.postMessage({
            error: error.message,
            stack: error.stack,
            name: error.name
        });
    }
};

function createOption(params) {
    try {
        const [baseType, subType] = params.optionType.split('-');
        console.log('Creating option of type:', baseType, 'subtype:', subType);

        let option;
        switch(baseType) {
            case 'asian':
                option = new AsianOption({
                    ...params,
                    type: subType
                });
                break;
            case 'barrier':
                option = new BarrierOption({
                    ...params,
                    type: subType.endsWith('call') ? 'call' : 'put',
                    barrierType: subType.replace(/(call|put)$/, '')
                });
                break;
            case 'lookback':
                option = new LookbackOption({
                    ...params,
                    lookbackType: subType
                });
                break;
            default:
                throw new Error(`Invalid option type: ${baseType}`);
        }
        console.log('Option created successfully:', option);
        return option;
    } catch (error) {
        console.error('Error creating option:', error);
        throw error;
    }
} 