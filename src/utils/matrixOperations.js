/**
 * Performs Cholesky decomposition on a symmetric positive-definite matrix
 * Returns lower triangular matrix L where A = L * L^T
 * @param {number[][]} matrix - The input correlation/covariance matrix
 * @returns {number[][]} The lower triangular matrix
 */
export function cholesky(matrix) {
    const n = matrix.length;
    const L = Array(n).fill().map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
        for (let j = 0; j <= i; j++) {
            let sum = 0;

            if (j === i) {
                for (let k = 0; k < j; k++) {
                    sum += L[j][k] * L[j][k];
                }
                L[i][j] = Math.sqrt(matrix[i][i] - sum);
            } else {
                for (let k = 0; k < j; k++) {
                    sum += L[i][k] * L[j][k];
                }
                L[i][j] = (matrix[i][j] - sum) / L[j][j];
            }
        }

        // Check for positive definiteness
        if (L[i][i] <= 0) {
            throw new Error('Matrix is not positive definite');
        }
    }

    return L;
}

/**
 * Generates correlated random variables using Cholesky decomposition
 * @param {number[][]} correlationMatrix - The correlation matrix
 * @param {number[]} standardNormals - Array of independent standard normal variables
 * @returns {number[]} Array of correlated random variables
 */
export function generateCorrelatedVariables(correlationMatrix, standardNormals) {
    const L = cholesky(correlationMatrix);
    const n = correlationMatrix.length;
    const result = new Array(n).fill(0);

    for (let i = 0; i < n; i++) {
        for (let j = 0; j <= i; j++) {
            result[i] += L[i][j] * standardNormals[j];
        }
    }

    return result;
}

/**
 * Validates if a matrix is symmetric
 * @param {number[][]} matrix - The input matrix to validate
 * @returns {boolean} True if the matrix is symmetric
 */
export function isSymmetric(matrix) {
    const n = matrix.length;
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < i; j++) {
            if (Math.abs(matrix[i][j] - matrix[j][i]) > 1e-10) {
                return false;
            }
        }
    }
    return true;
}

/**
 * Validates if a correlation matrix is valid (symmetric and positive semi-definite)
 * @param {number[][]} matrix - The correlation matrix to validate
 * @returns {boolean} True if the matrix is a valid correlation matrix
 */
export function isValidCorrelationMatrix(matrix) {
    // Check if matrix is square
    const n = matrix.length;
    if (!matrix.every(row => row.length === n)) {
        return false;
    }

    // Check if matrix is symmetric
    if (!isSymmetric(matrix)) {
        return false;
    }

    // Check diagonal elements are 1
    for (let i = 0; i < n; i++) {
        if (Math.abs(matrix[i][i] - 1) > 1e-10) {
            return false;
        }
    }

    // Check if all elements are between -1 and 1
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            if (matrix[i][j] < -1 || matrix[i][j] > 1) {
                return false;
            }
        }
    }

    // Try Cholesky decomposition to check positive definiteness
    try {
        cholesky(matrix);
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Multiplies two matrices
 * @param {number[][]} a - First matrix
 * @param {number[][]} b - Second matrix
 * @returns {number[][]} Result of matrix multiplication
 */
export function matrixMultiply(a, b) {
    const m = a.length;
    const n = b[0].length;
    const p = b.length;
    
    if (a[0].length !== p) {
        throw new Error('Invalid matrix dimensions for multiplication');
    }
    
    const result = Array(m).fill().map(() => Array(n).fill(0));
    
    for (let i = 0; i < m; i++) {
        for (let j = 0; j < n; j++) {
            for (let k = 0; k < p; k++) {
                result[i][j] += a[i][k] * b[k][j];
            }
        }
    }
    
    return result;
}

/**
 * Transposes a matrix
 * @param {number[][]} matrix - Input matrix
 * @returns {number[][]} Transposed matrix
 */
export function transpose(matrix) {
    const rows = matrix.length;
    const cols = matrix[0].length;
    const result = Array(cols).fill().map(() => Array(rows).fill(0));
    
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            result[j][i] = matrix[i][j];
        }
    }
    
    return result;
} 