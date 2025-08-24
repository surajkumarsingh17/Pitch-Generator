// static/script.js
document.addEventListener('DOMContentLoaded', () => {
    // --- 1. GET ELEMENT REFERENCES ---
    const appContainer = document.querySelector('.app-container');
    const historyToggleBtn = document.getElementById('history-toggle-btn');
    const generateBtn = document.getElementById('generate-btn');
    const ideaInput = document.getElementById('idea-input');
    const resultContainer = document.getElementById('result-container');
    const historyList = document.getElementById('history-list');
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    const themeToggle = document.getElementById('theme-toggle');

    // --- 2. THEME SWITCHER LOGIC ---
    const applyTheme = (theme) => {
        document.body.classList.toggle('theme-light', theme === 'light');
    };
    
    themeToggle.addEventListener('change', () => {
        const theme = themeToggle.checked ? 'light' : 'dark';
        localStorage.setItem('theme', theme);
        applyTheme(theme);
    });

    const loadTheme = () => {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        themeToggle.checked = savedTheme === 'light';
        applyTheme(savedTheme);
    };

    // --- 3. SLIDABLE SIDEBAR LOGIC ---
    const toggleHistoryPanel = () => {
        appContainer.classList.toggle('history-closed');
        const isClosed = appContainer.classList.contains('history-closed');
        localStorage.setItem('sidebarState', isClosed ? 'closed' : 'open');
    };

    const applyInitialSidebarState = () => {
        const savedState = localStorage.getItem('sidebarState');
        if (savedState === 'closed') {
            appContainer.classList.add('history-closed');
        }
    };

    // --- 4. ADVANCED RESPONSE PROCESSING ---
    const processAndRenderResponse = (pitch) => {
        // Use marked.js to convert markdown to HTML
        let processedHtml = marked.parse(pitch);
        
        resultContainer.innerHTML = ''; // Clear previous results
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = processedHtml;

        // Group content under H2 tags into styled blocks
        let currentBlock = null;
        Array.from(tempDiv.childNodes).forEach(node => {
            if (node.nodeName === 'H2') {
                if (currentBlock) resultContainer.appendChild(currentBlock); // Append the previous block
                currentBlock = document.createElement('div');
                currentBlock.className = 'result-block';
                currentBlock.appendChild(node);
            } else if (currentBlock) {
                // Append paragraphs, lists, etc., to the current block
                currentBlock.appendChild(node.cloneNode(true));
            } else {
                 // If content appears before the first H2, wrap it too
                 if (node.textContent.trim()) {
                    currentBlock = document.createElement('div');
                    currentBlock.className = 'result-block';
                    currentBlock.appendChild(node.cloneNode(true));
                 }
            }
        });

        // Append the last block if it exists
        if (currentBlock) resultContainer.appendChild(currentBlock);
    };
    
    // --- 5. HISTORY MANAGEMENT ---
    const loadHistory = () => {
        const history = JSON.parse(localStorage.getItem('pitchHistory')) || [];
        historyList.innerHTML = '';
        history.forEach(item => renderHistoryItem(item));
    };

    const renderHistoryItem = (item) => {
        const li = document.createElement('li');
        li.classList.add('history-item');
        li.dataset.id = item.id;
        // Truncate long ideas for the history view
        const title = item.idea.split('\n')[0].substring(0, 30) + (item.idea.length > 30 ? '...' : '');
        const date = new Date(item.timestamp).toLocaleString();
        li.innerHTML = `<h3>${title}</h3><p>${date}</p>`;
        
        // Event listener to load a history item when clicked
        li.addEventListener('click', () => {
            ideaInput.value = item.idea;
            processAndRenderResponse(item.pitch);
            document.getElementById('tone-select').value = item.options.tone;
            document.getElementById('audience-select').value = item.options.audience;
            document.querySelectorAll('#sections-fieldset input[type="checkbox"]').forEach(cb => {
                cb.checked = item.options.sections.includes(cb.value);
            });
        });
        historyList.prepend(li); // Prepend to show the newest items first
    };

    const saveToHistory = (idea, options, pitch) => {
        let history = JSON.parse(localStorage.getItem('pitchHistory')) || [];
        const newItem = { id: Date.now(), timestamp: new Date(), idea, options, pitch };
        history.push(newItem);
        localStorage.setItem('pitchHistory', JSON.stringify(history));
        renderHistoryItem(newItem);
    };

    const clearHistory = () => {
        if (confirm('Are you sure you want to clear all generation history?')) {
            localStorage.removeItem('pitchHistory');
            historyList.innerHTML = '';
        }
    };

    // --- 6. MAIN GENERATION LOGIC ---
    const handleGeneration = async () => {
        const idea = ideaInput.value;
        const options = {
            tone: document.getElementById('tone-select').value,
            audience: document.getElementById('audience-select').value,
            sections: Array.from(document.querySelectorAll('#sections-fieldset input:checked')).map(cb => cb.value)
        };

        if (!idea.trim()) {
            alert('Please enter your startup idea!');
            return;
        }
        if (options.sections.length === 0) {
            alert('Please select at least one section to generate!');
            return;
        }

        generateBtn.classList.add('loading');
        generateBtn.disabled = true;
        resultContainer.innerHTML = '<div class="placeholder">🧠 Crafting your masterpiece... Please wait.</div>';

        try {
            const response = await fetch('/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idea, options }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || `HTTP error! Status: ${response.status}`);
            
            processAndRenderResponse(data.pitch);
            saveToHistory(idea, options, data.pitch);

        } catch (error) {
            console.error('Error:', error);
            resultContainer.innerHTML = `<div class="placeholder error">❌ An error occurred: ${error.message}</div>`;
        } finally {
            generateBtn.classList.remove('loading');
            generateBtn.disabled = false;
        }
    };

    // --- 7. INITIALIZE APP ---
    historyToggleBtn.addEventListener('click', toggleHistoryPanel);
    generateBtn.addEventListener('click', handleGeneration);
    clearHistoryBtn.addEventListener('click', clearHistory);
    
    loadTheme();
    applyInitialSidebarState();
    loadHistory();
});
