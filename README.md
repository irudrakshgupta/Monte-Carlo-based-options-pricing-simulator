# Monte Carlo Options Pricing Simulator

A sophisticated options pricing engine implementing Monte Carlo methods for exotic options with real-time visualization and risk analysis.

## 🚀 Features

### Core Pricing Models
- Asian Options (Arithmetic & Geometric Average)
- Barrier Options (Up/Down, In/Out)
- Lookback Options (Fixed & Floating Strike)
- Multi-asset correlation with Cholesky decomposition

### Advanced Analytics
- Greeks Estimation (Δ, Γ, Θ, ν, ρ)
- Risk Metrics (VaR, Expected Shortfall, Sharpe/Sortino ratios)
- Interactive Visualization
- Real-time Computation with Web Workers

## 📐 Mathematical Foundation

### 1. Geometric Brownian Motion
The underlying asset price follows:

```math
dS = μSdt + σSdW
```
where:
- S: Asset price
- μ: Drift rate (risk-free rate - dividend yield)
- σ: Volatility
- dW: Wiener process increment

### 2. Monte Carlo Discretization
Using Euler-Maruyama discretization:

```math
S_{t+Δt} = S_t \exp\left((r - \frac{1}{2}\sigma^2)Δt + \sigma\sqrt{Δt}Z\right)
```
where Z ~ N(0,1)

### 3. Option Types & Pricing Formulas

#### Asian Options
For arithmetic average options:
```math
C_A = e^{-rT}\mathbb{E}\left[\max\left(\frac{1}{n}\sum_{i=1}^n S_{t_i} - K, 0\right)\right]
```

For geometric average options:
```math
C_G = e^{-rT}\mathbb{E}\left[\max\left(\exp\left(\frac{1}{n}\sum_{i=1}^n \ln S_{t_i}\right) - K, 0\right)\right]
```

#### Barrier Options
For up-and-out call options:
```math
C_{UO} = e^{-rT}\mathbb{E}\left[\max(S_T - K, 0) \cdot \mathbf{1}_{\{\max_{0\leq t\leq T} S_t < B\}}\right]
```
where B is the barrier level

#### Lookback Options
For floating strike lookback call:
```math
C_{FL} = e^{-rT}\mathbb{E}\left[\max(S_T - \min_{0\leq t\leq T} S_t, 0)\right]
```

### 4. Greeks Calculation
Using finite difference approximations:

```math
\begin{align*}
Δ &= \frac{\partial V}{\partial S} \approx \frac{V(S + h) - V(S - h)}{2h} \\
Γ &= \frac{\partial^2 V}{\partial S^2} \approx \frac{V(S + h) - 2V(S) + V(S - h)}{h^2} \\
Θ &= -\frac{\partial V}{\partial t} \\
ν &= \frac{\partial V}{\partial σ} \\
ρ &= \frac{\partial V}{\partial r}
\end{align*}
```

### 5. Variance Reduction Techniques

#### Antithetic Variates
```math
V_{reduced} = \frac{1}{2}[V(Z) + V(-Z)]
```

#### Control Variates
For Asian options using geometric average as control:
```math
V_{reduced} = V_A + β(V_G - \mathbb{E}[V_G])
```
where β is the optimal control coefficient

### 6. Risk Metrics

#### Value at Risk (VaR)
```math
P(V_T - V_0 ≤ -VaR_α) = α
```

#### Expected Shortfall
```math
ES_α = -\mathbb{E}[V_T - V_0 | V_T - V_0 ≤ -VaR_α]
```

#### Sharpe Ratio
```math
SR = \frac{\mathbb{E}[R] - r_f}{\sqrt{\text{Var}[R]}}
```

## 🛠 Technical Stack
- JavaScript (ES6+)
- D3.js & Plotly.js for visualization
- Web Workers API for parallel computation
- Vite for build optimization

## 🚦 Getting Started

1. Clone the repository:
```bash
git clone https://github.com/yourusername/monte-carlo-options-pricing.git
cd monte-carlo-options-pricing
```

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm start
```

## 📊 Usage Example

```javascript
const option = new AsianOption({
    type: 'call',
    strike: 100,
    spot: 100,
    volatility: 0.2,
    riskFreeRate: 0.05,
    maturity: 1,
    steps: 252,
    simulations: 10000,
    useAntithetic: true,
    useStratified: true
});

const result = option.price();
console.log(result.price, result.confidence);
```

## 🎯 Model Assumptions

1. Market Assumptions
   - Log-normal price distribution
   - Constant volatility (except in jump-diffusion)
   - No arbitrage opportunities
   - Continuous trading

2. Implementation Notes
   - Euler-Maruyama discretization
   - Finite difference Greeks approximation
   - Broadie-Glasserman-Kou continuous barrier correction

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. 