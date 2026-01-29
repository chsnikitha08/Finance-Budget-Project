const app = {
    income: null,
    transactions: JSON.parse(localStorage.getItem('financeflow.transactions')) || [],
    budget: JSON.parse(localStorage.getItem('financeflow.budget')) || {
        food: 0, transport: 0, entertainment: 0,
        shopping: 0, bills: 0, other: 0
    },
    editingBudget: null,
    selectedCategory: 'other',
    categoryColors: {
        food: '#ef4444', transport: '#f59e0b', entertainment: '#8b5cf6',
        shopping: '#10b981', bills: '#6b7280', other: '#9ca3af'
    },

    init() {
        this.bindEvents();
        this.loadSavedData();
        this.renderAll();
    },

    bindEvents() {
        document.getElementById('quickStart').onclick = () => this.showApp();
        document.getElementById('addTransactionBtn').onclick = () => this.showTransactionModal();
        document.getElementById('deleteAllTransactions').onclick = () => this.deleteAllTransactions();
        document.getElementById('cancelTransaction').onclick = () => this.hideTransactionModal();
        document.getElementById('transactionForm').onsubmit = (e) => {
            e.preventDefault();
            this.saveTransaction();
        };
        document.getElementById('searchTransactions').oninput = (e) => this.searchTransactions(e.target.value);
        document.getElementById('budgetAmountInput').oninput = () => this.validateBudgetInput();

        // Handle category buttons and delete buttons globally
        document.addEventListener('click', (e) => {
            // Category buttons
            if (e.target.classList.contains('category-btn')) {
                app.selectCategory(e.target.dataset.category);
            }

            // Delete single transaction
            if (e.target.classList.contains('delete-btn')) {
                if (confirm('Delete this transaction?')) {
                    app.deleteTransaction(parseInt(e.target.dataset.id));
                }
            }
        });
    },

    loadSavedData() {
        const savedIncome = localStorage.getItem('financeflow.income');
        const savedBudget = localStorage.getItem('financeflow.budget');

        if (savedIncome !== null && !isNaN(savedIncome)) {
            this.income = parseFloat(savedIncome);
            document.getElementById('monthlyIncome').value = this.income;
        } else {
            this.income = null;
            document.getElementById('monthlyIncome').value = '';
        }

        if (savedBudget) {
            this.budget = JSON.parse(savedBudget);
        }
    },

    getTotalBudget() {
        return Object.values(this.budget).reduce((sum, val) => sum + val, 0);
    },

    setIncome() {
        const value = document.getElementById('monthlyIncome').value;
        const income = parseFloat(value);

        if (!income || income <= 0) {
            alert('Please enter a valid monthly income');
            return;
        }

        this.income = income;
        localStorage.setItem('financeflow.income', income);
        this.renderAll();
    },

    resetIncome() {
        if (confirm('⚠️ Reset monthly income AND delete all expenditure data?\nThis action cannot be undone.')) {
            this.income = null;
            document.getElementById('monthlyIncome').value = '';
            localStorage.removeItem('financeflow.income');

            this.budget = { food:0, transport:0, entertainment:0, shopping:0, bills:0, other:0 };
            localStorage.setItem('financeflow.budget', JSON.stringify(this.budget));

            this.transactions = [];
            localStorage.removeItem('financeflow.transactions');

            this.renderAll();
            alert('✅ Income, budgets, and all expenditure data have been reset');
        }
    },

    setDefaultBudgets() {
        if (confirm('⚠️ Reset ALL budgets and DELETE all expenditure history?\nThis action cannot be undone.')) {
            this.budget = { food:0, transport:0, entertainment:0, shopping:0, bills:0, other:0 };
            localStorage.setItem('financeflow.budget', JSON.stringify(this.budget));

            this.transactions = [];
            localStorage.removeItem('financeflow.transactions');

            this.renderAll();
            alert('✅ Budgets and all expenditure data have been reset');
        }
    },

    validateBudgetInput() {
        const input = document.getElementById('budgetAmountInput');
        const warning = document.getElementById('budgetWarning');
        const saveBtn = document.getElementById('saveBudgetBtn');

        const amount = parseFloat(input.value) || 0;
        const currentTotal = this.getTotalBudget();
        const oldAmount = this.budget[this.editingBudget] || 0;
        const projectedTotal = currentTotal - oldAmount + amount;

        input.classList.remove('error');
        warning.style.display = 'none';
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Budget';

        if (projectedTotal > this.income && amount > 0) {
            input.classList.add('error');
            const overBy = projectedTotal - this.income;
            warning.textContent = `⚠️ Exceeds income by ₹${this.formatNumber(overBy)}`;
            warning.style.display = 'block';
            saveBtn.disabled = true;
            saveBtn.textContent = 'Cannot Save';
        }
    },

    showApp() {
        document.getElementById('cover').style.display = 'none';
        document.getElementById('app').classList.add('show');
        this.renderAll();
    },

    renderAll() {
        this.renderBalance();
        this.renderTransactions();
        this.renderBudget();
        this.renderCharts();
        this.updateStats();
    },

    formatNumber(num) {
        return Math.round(num).toLocaleString('en-IN');
    },

    getPeriodTransactions() {
        return this.transactions.filter(t => t.date.startsWith('2026-01'));
    },

    renderBalance() {
        const totalSpent = this.getPeriodTransactions().reduce((sum, t) => sum + t.amount, 0);
        const balance = this.income ? this.income - totalSpent : 0;
        document.getElementById('balance').textContent = '₹' + this.formatNumber(balance);
        document.getElementById('totalSpent').textContent = '₹' + this.formatNumber(totalSpent);
    },

    renderTransactions() {
        const transactions = this.getPeriodTransactions();
        const container = document.getElementById('transactionsList');
        container.innerHTML = transactions.slice(-8).reverse().map(t => `
            <div class="transaction-item">
                <div>
                    <div style="font-weight: 600;">${t.merchant}</div>
                    <div style="font-size: 0.9rem; opacity: 0.7;">${t.category} • ${t.date}</div>
                </div>
                <div>
                    <div class="amount negative">₹${this.formatNumber(t.amount)}</div>
                    <button class="delete-btn btn danger" data-id="${t.id}" style="padding: 0.3rem 0.8rem; font-size: 0.8rem;">🗑️</button>
                </div>
            </div>
        `).join('') || 'No transactions yet!';
    },

    getCategorySpending() {
        const spending = {};
        this.getPeriodTransactions().forEach(t => {
            spending[t.category] = (spending[t.category] || 0) + t.amount;
        });
        return spending;
    },

    renderBudget() {
        const container = document.getElementById('budgetItems');
        const spending = this.getCategorySpending();

        container.innerHTML = Object.entries(this.budget).map(([cat, budget]) => {
            const spent = spending[cat] || 0;
            let status = budget > 0 ? '✅ Set' : '⚠️ Not Set';
            let statusColor = budget > 0 ? '#10b981' : '#fbbf24';
            let pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;

            if (budget > 0 && spent > budget) {
                status = '⚠️ Over Budget';
                statusColor = '#ef4444';
            }

            const itemClass = spent > budget ? 'budget-item over-allocated' : 'budget-item';

            return `
                <div class="${itemClass}" onclick="app.editBudget('${cat}', ${budget})">
                    <div>
                        <strong>${cat.charAt(0).toUpperCase() + cat.slice(1)}</strong>
                        <div style="font-size: 0.85rem; color: ${statusColor};">${status}</div>
                    </div>
                    <div style="text-align: right;">
                        <div>₹${this.formatNumber(spent)} ${budget > 0 ? `/ ₹${this.formatNumber(budget)}` : ''}</div>
                        <div class="budget-edit">${budget > 0 ? pct.toFixed(0) + '%' : '0%'}</div>
                    </div>
                </div>
            `;
        }).join('');
    },

    editBudget(category, currentBudget) {
        this.editingBudget = category;
        document.getElementById('budgetModalTitle').textContent = `Set ${category.charAt(0).toUpperCase() + category.slice(1)} Budget`;
        document.getElementById('budgetAmountInput').value = currentBudget;
        document.getElementById('budgetModal').classList.add('show');
        document.getElementById('budgetAmountInput').focus();
        this.validateBudgetInput();
    },

    saveBudget() {
        if (!this.editingBudget) return;

        const amount = parseFloat(document.getElementById('budgetAmountInput').value) || 0;
        const currentTotal = this.getTotalBudget();
        const oldAmount = this.budget[this.editingBudget] || 0;
        const projectedTotal = currentTotal - oldAmount + amount;

        if (projectedTotal > this.income) {
            alert(`❌ Total budgets (₹${this.formatNumber(projectedTotal)}) cannot exceed monthly income (₹${this.formatNumber(this.income)})`);
            return;
        }

        this.budget[this.editingBudget] = amount;
        localStorage.setItem('financeflow.budget', JSON.stringify(this.budget));
        this.closeBudgetModal();
        this.renderAll();
    },

    closeBudgetModal() {
        document.getElementById('budgetModal').classList.remove('show');
        document.getElementById('budgetAmountInput').classList.remove('error');
        document.getElementById('budgetWarning').style.display = 'none';
        document.getElementById('saveBudgetBtn').disabled = false;
        document.getElementById('saveBudgetBtn').textContent = 'Save Budget';
        this.editingBudget = null;
    },

    updateStats() {
        const transactions = this.getPeriodTransactions();
        const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0);

        document.getElementById('incomeDisplay').textContent =
            this.income ? '₹' + this.formatNumber(this.income) : '—';

        document.getElementById('savingsRate').textContent =
            this.income ? Math.round(((this.income - totalSpent) / this.income) * 100) + '%' : '—';
    },

    renderCharts() {
        this.renderPieChart();
        this.renderBarChart();
    },

    renderPieChart() {
        const canvas = document.getElementById('categoryChart');
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * 2;
        canvas.height = rect.height * 2;
        ctx.scale(2, 2);

        ctx.fillStyle = 'rgba(15,15,35,0.95)';
        ctx.fillRect(0, 0, rect.width, rect.height);

        const spending = this.getCategorySpending();
        const total = Object.values(spending).reduce((a,b)=>a+b,0);

        if(total===0){
            ctx.fillStyle='rgba(255,255,255,0.4)';
            ctx.font='bold 28px sans-serif';
            ctx.textAlign='center';
            ctx.textBaseline='middle';
            ctx.fillText('No Spending', rect.width/2, rect.height/2);
            return;
        }

        const centerX=rect.width/2;
        const centerY=rect.height/2;
        const radius=Math.min(centerX-40, rect.height/2-40);
        let angle=-Math.PI/2;

        Object.entries(spending).forEach(([cat,amt])=>{
            const slice=(amt/total)*2*Math.PI;
            ctx.beginPath();
            ctx.moveTo(centerX,centerY);
            ctx.arc(centerX,centerY,radius,angle,angle+slice);
            ctx.closePath();
            ctx.fillStyle=this.categoryColors[cat]||'#9ca3af';
            ctx.fill();
            ctx.strokeStyle='rgba(255,255,255,0.4)';
            ctx.lineWidth=3;
            ctx.stroke();
            angle+=slice;
        });

        ctx.beginPath();
        ctx.arc(centerX,centerY,radius*0.3,0,2*Math.PI);
        ctx.fillStyle='rgba(255,255,255,0.1)';
        ctx.fill();
        ctx.strokeStyle='rgba(255,255,255,0.3)';
        ctx.lineWidth=2;
        ctx.stroke();

        ctx.fillStyle='rgba(255,255,255,0.9)';
        ctx.font='bold 20px sans-serif';
        ctx.textAlign='center';
        ctx.textBaseline='middle';
        ctx.fillText('₹'+this.formatNumber(total), centerX,centerY);
    },

    renderBarChart() {
        const canvas = document.getElementById('budgetChart');
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        canvas.width=rect.width*2;
        canvas.height=rect.height*2;
        ctx.scale(2,2);

        ctx.fillStyle='rgba(15,15,35,0.95)';
        ctx.fillRect(0,0,rect.width,rect.height);

        const categories=Object.keys(this.budget);
        const barHeight=30;
        const barSpacing=15;
        const barStartX=120;
        const barWidth=rect.width-barStartX-20;
        const totalHeight=categories.length*(barHeight+barSpacing);
        const startY=Math.max(20,(rect.height-totalHeight)/2);

        categories.forEach((cat,i)=>{
            const budget=this.budget[cat];
            const spent=this.getCategorySpending()[cat]||0;
            const pct=budget>0?Math.min(spent/budget,1):0;
            const y=startY+i*(barHeight+barSpacing);

            ctx.fillStyle='rgba(255,255,255,0.1)';
            ctx.fillRect(barStartX,y,barWidth,barHeight);

            ctx.fillStyle=this.categoryColors[cat];
            ctx.fillRect(barStartX,y,pct*barWidth,barHeight);

            ctx.fillStyle='white';
            ctx.font='bold 12px sans-serif';
            ctx.textAlign='left';
            ctx.fillText(cat.charAt(0).toUpperCase()+cat.slice(1),15,y+barHeight/2+4);

            ctx.textAlign='right';
            ctx.fillText('₹'+this.formatNumber(spent),rect.width-15,y+barHeight/2);

            if(budget>0){
                ctx.fillStyle='rgba(255,255,255,0.6)';
                ctx.font='10px sans-serif';
                ctx.fillText('/₹'+this.formatNumber(budget),rect.width-15,y+barHeight/2+12);
            }
        });
    },

    showTransactionModal() {
        document.getElementById('transactionModal').classList.add('show');
        document.getElementById('merchantInput').focus();
        document.getElementById('dateInput').value = new Date().toISOString().slice(0,10);
        this.selectCategory('other');
    },

    hideTransactionModal() {
        document.getElementById('transactionModal').classList.remove('show');
        document.getElementById('transactionForm').reset();
    },

    saveTransaction() {
        const merchant=document.getElementById('merchantInput').value;
        const amount=parseFloat(document.getElementById('amountInput').value);
        const date=document.getElementById('dateInput').value || new Date().toISOString().slice(0,10);
        const category=document.getElementById('selectedCategory').value;

        if(!merchant || !amount || amount<=0){
            alert('Please fill all fields correctly');
            return;
        }

        this.transactions.unshift({
            id:Date.now(),
            merchant,
            amount,
            category,
            date
        });

        localStorage.setItem('financeflow.transactions',JSON.stringify(this.transactions));
        this.hideTransactionModal();
        this.renderAll();
    },

    deleteTransaction(id){
        this.transactions=this.transactions.filter(t=>t.id!==id);
        localStorage.setItem('financeflow.transactions',JSON.stringify(this.transactions));
        this.renderAll();
    },

    deleteAllTransactions(){
        if(confirm('⚠️ Delete ALL transactions? This cannot be undone!')){
            this.transactions=[];
            localStorage.removeItem('financeflow.transactions');
            this.renderAll();
        }
    },

    selectCategory(category){
        document.querySelectorAll('.category-btn').forEach(btn=>btn.classList.remove('active'));
        const activeBtn=document.querySelector(`[data-category="${category}"]`);
        if(activeBtn) activeBtn.classList.add('active');

        document.getElementById('selectedCategory').value=category;
        this.selectedCategory=category;
    },

    searchTransactions(query){
        const all=this.getPeriodTransactions();
        const filtered=all.filter(t=>
            t.merchant.toLowerCase().includes(query.toLowerCase())||
            t.category.toLowerCase().includes(query.toLowerCase())
        );
        document.getElementById('transactionsList').innerHTML=filtered.slice(-8).reverse().map(t=>`
            <div class="transaction-item">
                <div>
                    <div style="font-weight:600;">${t.merchant}</div>
                    <div style="font-size:0.9rem; opacity:0.7;">${t.category} • ${t.date}</div>
                </div>
                <div class="amount negative">₹${this.formatNumber(t.amount)}</div>
            </div>
        `).join('')||'No matching transactions';
    }
};

app.init();
