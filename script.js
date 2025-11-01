class JSONViewPro {
    constructor() {
        this.editor = null;
        this.currentView = 'tree';
        this.jsonData = null;
        this.searchMatches = [];
        this.currentMatchIndex = 0;
        this.originalEditor = null;
        this.compareEditor = null;
        this.pathExplorer = null;
        this.init();
    }

    init() {
        this.indentSize = 2;
        this.addLoadingAnimation();
        this.initMonacoEditor();
        this.setupEventListeners();
        this.setupDragAndDrop();
        this.loadSampleData();
        this.addInteractiveEffects();
        this.setupPathExplorer();
    }
    
    addLoadingAnimation() {
        const panels = document.querySelectorAll('.left-panel, .right-panel');
        panels.forEach((panel, index) => {
            panel.style.animationDelay = `${index * 0.2}s`;
        });
    }
    
    addInteractiveEffects() {
        // Add ripple effect to buttons
        document.querySelectorAll('.btn, .convert-btn').forEach(btn => {
            btn.addEventListener('click', this.createRipple.bind(this));
        });
        
        // Add hover effects to JSON tree nodes
        document.addEventListener('mouseover', (e) => {
            if (e.target.classList.contains('json-key') || e.target.classList.contains('json-string')) {
                e.target.style.transition = 'all 0.2s ease';
                e.target.style.transform = 'scale(1.02)';
            }
        });
        
        document.addEventListener('mouseout', (e) => {
            if (e.target.classList.contains('json-key') || e.target.classList.contains('json-string')) {
                e.target.style.transform = 'scale(1)';
            }
        });
    }
    
    createRipple(e) {
        const button = e.currentTarget;
        const ripple = document.createElement('span');
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;
        
        ripple.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            left: ${x}px;
            top: ${y}px;
            background: rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            transform: scale(0);
            animation: ripple 0.6s linear;
            pointer-events: none;
        `;
        
        button.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
    }

    setupPathExplorer() {
        this.pathExplorer = document.createElement('div');
        this.pathExplorer.className = 'path-explorer';
        this.pathExplorer.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            background: var(--glass-bg);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 12px;
            padding: 0.75rem 1rem;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.8rem;
            color: var(--text-primary);
            z-index: 999;
            transform: translateY(100%);
            transition: all 0.3s ease;
            max-width: 400px;
            word-break: break-all;
            display: none;
        `;
        
        document.body.appendChild(this.pathExplorer);
    }

    showPath(path, element) {
        const rect = element.getBoundingClientRect();
        
        this.pathExplorer.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <span style="color: var(--accent-cyan); font-weight: 600;">Path:</span>
                <code style="background: var(--bg-secondary); padding: 0.25rem 0.5rem; border-radius: 4px; flex: 1;">${path}</code>
                <button onclick="navigator.clipboard.writeText('${path}'); this.style.color='#10b981'; this.textContent='✓'; setTimeout(() => { this.style.color='var(--text-primary)'; this.textContent='📋'; }, 1000)" 
                        style="background: none; border: none; cursor: pointer; font-size: 1rem; padding: 0.25rem; color: var(--text-primary); transition: color 0.2s ease;">📋</button>
            </div>
        `;
        
        this.pathExplorer.style.cssText = `
            position: fixed;
            left: ${rect.left}px;
            top: ${rect.top - 75}px;
            background: var(--glass-bg);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 12px;
            padding: 0.75rem 1rem;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.8rem;
            color: var(--text-primary);
            z-index: 999;
            max-width: 400px;
            word-break: break-all;
            display: block;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), 0 0 20px rgba(0, 245, 255, 0.2);
            transform: translateY(-10px) scale(0.9);
            opacity: 0;
            transition: all 0.3s ease;
        `;
        
        setTimeout(() => {
            this.pathExplorer.style.transform = 'translateY(0) scale(1)';
            this.pathExplorer.style.opacity = '1';
        }, 10);
        
        // Auto hide after 3 seconds
        clearTimeout(this.pathTimeout);
        this.pathTimeout = setTimeout(() => {
            this.hidePath();
        }, 3000);
    }

    hidePath() {
        this.pathExplorer.style.transform = 'translateY(-10px) scale(0.9)';
        this.pathExplorer.style.opacity = '0';
        setTimeout(() => {
            this.pathExplorer.style.display = 'none';
        }, 300);
    }

    initMonacoEditor() {
        require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs' } });
        require(['vs/editor/editor.main'], () => {
            this.editor = monaco.editor.create(document.getElementById('jsonEditor'), {
                value: '',
                language: 'json',
                theme: 'vs-dark',
                automaticLayout: true,
                minimap: { enabled: false },
                fontSize: 14,
                fontFamily: 'JetBrains Mono',
                lineNumbers: 'on',
                roundedSelection: false,
                scrollBeyondLastLine: false,
                readOnly: false,
                cursorStyle: 'line',
                wordWrap: 'on'
            });

            this.editor.onDidChangeModelContent(() => {
                this.updateViews();
                this.updateStats();
                if (document.getElementById('autoValidate')?.checked) {
                    this.validateJSON(true);
                }
            });
        });
    }

    setupEventListeners() {
        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', this.toggleTheme.bind(this));
        
        // Search functionality
        const searchInput = document.getElementById('searchInput');
        const searchClear = document.getElementById('searchClear');
        
        searchInput.addEventListener('input', (e) => {
            const value = e.target.value;
            const hasValue = value.trim().length > 0;
            searchClear.style.display = hasValue ? 'flex' : 'none';
            document.getElementById('searchNavigation').style.display = 'none';
            this.searchJSON(value);
        });
        
        searchClear.addEventListener('click', () => {
            searchInput.value = '';
            searchClear.style.display = 'none';
            document.getElementById('searchNavigation').style.display = 'none';
            this.searchJSON('');
            searchInput.focus();
        });
        
        document.getElementById('searchPrev').addEventListener('click', () => this.navigateSearch(-1));
        document.getElementById('searchNext').addEventListener('click', () => this.navigateSearch(1));
        
        // Editor toolbar
        document.getElementById('formatBtn').addEventListener('click', this.formatJSON.bind(this));
        document.getElementById('minifyBtn').addEventListener('click', this.minifyJSON.bind(this));
        document.getElementById('copyBtn').addEventListener('click', this.copyJSON.bind(this));
        document.getElementById('validateBtn').addEventListener('click', this.validateJSON.bind(this));
        document.getElementById('uploadBtn').addEventListener('click', this.openUploadModal.bind(this));
        document.getElementById('compareBtn').addEventListener('click', this.openCompareModal.bind(this));
        
        // Modal controls
        document.getElementById('closeModal').addEventListener('click', this.closeUploadModal.bind(this));
        document.getElementById('browseBtn').addEventListener('click', this.browseFiles.bind(this));
        document.getElementById('uploadModal').addEventListener('click', (e) => {
            if (e.target.id === 'uploadModal') this.closeUploadModal();
        });
        
        // Settings
        document.getElementById('settingsBtn').addEventListener('click', this.openSettingsModal.bind(this));
        document.getElementById('closeSettings').addEventListener('click', this.closeSettingsModal.bind(this));
        document.getElementById('settingsModal').addEventListener('click', (e) => {
            if (e.target.id === 'settingsModal') this.closeSettingsModal();
        });
        document.getElementById('indentSize').addEventListener('change', this.updateSettings.bind(this));
        document.getElementById('fontSize').addEventListener('change', this.updateSettings.bind(this));
        document.getElementById('autoFormat').addEventListener('change', this.updateSettings.bind(this));
        document.getElementById('showLineNumbers').addEventListener('change', this.updateSettings.bind(this));
        document.getElementById('wordWrap').addEventListener('change', this.updateSettings.bind(this));
        document.getElementById('autoValidate').addEventListener('change', this.updateSettings.bind(this));
        document.getElementById('showMinimap').addEventListener('change', this.updateSettings.bind(this));
        
        // Compare functionality
        document.getElementById('closeCompare').addEventListener('click', this.closeCompareModal.bind(this));
        document.getElementById('compareModal').addEventListener('click', (e) => {
            if (e.target.id === 'compareModal') this.closeCompareModal();
        });
        document.getElementById('runCompare').addEventListener('click', this.runComparison.bind(this));
        document.getElementById('swapCompare').addEventListener('click', this.swapCompareInputs.bind(this));
        
        // View toggles
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchView(e.target.dataset.view));
        });
        
        // Conversion buttons
        document.getElementById('jsonToCsv').addEventListener('click', this.convertToCSV.bind(this));
        document.getElementById('csvToJson').addEventListener('click', this.convertFromCSV.bind(this));
        document.getElementById('jsonToExcel').addEventListener('click', this.convertToExcel.bind(this));
        document.getElementById('jsonToXml').addEventListener('click', this.convertToXML.bind(this));
        document.getElementById('jsonToYaml').addEventListener('click', this.convertToYAML.bind(this));
        document.getElementById('clearAll').addEventListener('click', this.clearAll.bind(this));
    }

    setupDragAndDrop() {
        const dropZone = document.getElementById('dropZone');
        
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, this.preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => dropZone.classList.add('drag-over'), false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => dropZone.classList.remove('drag-over'), false);
        });

        dropZone.addEventListener('drop', this.handleDrop.bind(this), false);
        dropZone.addEventListener('click', this.browseFiles.bind(this));
    }
    
    openUploadModal() {
        document.getElementById('uploadModal').classList.add('active');
    }
    
    closeUploadModal() {
        document.getElementById('uploadModal').classList.remove('active');
    }
    
    browseFiles() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,.csv';
        input.onchange = (e) => {
            this.handleFileSelect(e.target.files[0]);
            this.closeUploadModal();
        };
        input.click();
    }
    
    openSettingsModal() {
        document.getElementById('settingsModal').classList.add('active');
    }
    
    closeSettingsModal() {
        document.getElementById('settingsModal').classList.remove('active');
    }
    
    updateSettings() {
        const indentSize = document.getElementById('indentSize').value;
        const fontSize = document.getElementById('fontSize').value;
        const showLineNumbers = document.getElementById('showLineNumbers').checked;
        const wordWrap = document.getElementById('wordWrap')?.checked;
        const showMinimap = document.getElementById('showMinimap')?.checked;
        
        if (this.editor) {
            this.editor.updateOptions({
                fontSize: parseInt(fontSize),
                lineNumbers: showLineNumbers ? 'on' : 'off',
                wordWrap: wordWrap ? 'on' : 'off',
                minimap: { enabled: showMinimap }
            });
        }
        
        this.indentSize = indentSize === '\t' ? '\t' : parseInt(indentSize);
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    handleDrop(e) {
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.handleFileSelect(files[0]);
            this.closeUploadModal();
        }
    }

    handleFileSelect(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            if (file.name.endsWith('.json')) {
                this.editor.setValue(content);
            } else if (file.name.endsWith('.csv')) {
                this.convertCSVToJSON(content);
            }
        };
        reader.readAsText(file);
    }

    loadSampleData() {
        const resumeJSON = {
            "personalInfo": {
                "name": "Navinkumar Palanivel",
                "email": "navinpersonalid@gmail.com",
                "location": "Salem, Tamilnadu",
                "age": 24
            },
            "skills": ["JavaScript", "Typescript", "Vue", "HTML", "CSS", "UI/UX Design"],
            "experience": [
                {
                    "position": "Frontend Developer",
                    "company": "Intellect Design Arena",
                    "duration": "2023-Present",
                    "responsibilities": ["Developed web applications", "Worked with Vue.js and TypeScript"]
                }
            ],
            "projects": [
                {
                    "name": "JSONView",
                    "description": "JSON viewer and editor application",
                    "technologies": ["JavaScript", "Vue", "CSS", "MongoDB"]
                }
            ],
            "preferences": {
                "theme": "dark",
                "notifications": true
            }
        };
        
        setTimeout(() => {
            if (this.editor) {
                this.editor.setValue(JSON.stringify(resumeJSON, null, 2));
            }
        }, 500);
    }

    formatJSON() {
        try {
            const value = this.editor.getValue();
            const parsed = JSON.parse(value);
            const formatted = JSON.stringify(parsed, null, this.indentSize || 2);
            this.editor.setValue(formatted);
            this.showNotification('JSON formatted successfully!', 'success');
        } catch (error) {
            this.showNotification('Invalid JSON format', 'error');
        }
    }

    minifyJSON() {
        try {
            const value = this.editor.getValue();
            const parsed = JSON.parse(value);
            const minified = JSON.stringify(parsed);
            this.editor.setValue(minified);
            this.showNotification('JSON minified successfully!', 'success');
        } catch (error) {
            this.showNotification('Invalid JSON format', 'error');
        }
    }

    copyJSON() {
        const value = this.editor.getValue();
        navigator.clipboard.writeText(value).then(() => {
            this.showNotification('JSON copied to clipboard!', 'success');
        });
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        
        if (this.editor) {
            monaco.editor.setTheme(newTheme === 'light' ? 'vs' : 'vs-dark');
        }
    }

    switchView(view) {
        this.currentView = view;
        
        document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-view="${view}"]`).classList.add('active');
        
        document.querySelectorAll('.view-content').forEach(content => content.classList.remove('active'));
        document.getElementById(`${view}View`).classList.add('active');
        
        this.updateViews();
    }

    updateViews() {
        try {
            const value = this.editor?.getValue() || '';
            if (!value.trim()) return;
            
            this.jsonData = JSON.parse(value);
            
            if (this.currentView === 'tree') {
                this.renderTreeView();
            } else if (this.currentView === 'table') {
                this.renderTableView();
            } else if (this.currentView === 'raw') {
                this.renderRawView();
            } else if (this.currentView === 'schema') {
                this.renderSchemaView();
            } else if (this.currentView === 'query') {
                this.renderQueryView();
            } else if (this.currentView === 'compare') {
                this.renderCompareView();
            }
        } catch (error) {
            // Invalid JSON - clear views
            document.querySelectorAll('.view-content').forEach(view => view.innerHTML = '');
        }
    }

    renderTreeView() {
        const container = document.getElementById('treeView');
        container.innerHTML = this.createTreeHTML(this.jsonData);
        this.setupTreeToggle();
    }

    createTreeHTML(obj, level = 0, path = '$', textPath = '') {
        const displayPath = textPath || path;
        
        if (obj === null) return `<span class="json-null json-clickable" data-path="${displayPath}" title="Type: null">null</span>`;
        if (typeof obj === 'string') {
            const preview = obj.length > 50 ? obj.substring(0, 50) + '...' : obj;
            return `<span class="json-string json-clickable" data-path="${displayPath}" title="Type: string | Length: ${obj.length}">"${preview}"</span>`;
        }
        if (typeof obj === 'number') {
            const type = Number.isInteger(obj) ? 'integer' : 'float';
            return `<span class="json-number json-clickable" data-path="${displayPath}" title="Type: ${type}">${obj}</span>`;
        }
        if (typeof obj === 'boolean') return `<span class="json-boolean json-clickable" data-path="${displayPath}" title="Type: boolean">${obj}</span>`;
        
        if (Array.isArray(obj)) {
            if (obj.length === 0) return `<span class="json-array json-clickable" data-path="${displayPath}" title="Empty array">[]</span>`;
            
            let html = '<div class="json-node">';
            html += '<span class="json-toggle">▼</span>';
            html += `<span class="json-bracket json-clickable" data-path="${displayPath}" title="Array with ${obj.length} items">[</span>`;
            html += `<span class="json-collapsed" style="display:none;"><span class="json-count">${obj.length} items</span></span>`;
            html += '<div class="json-children">';
            
            obj.forEach((item, index) => {
                const itemPath = `${path}[${index}]`;
                let itemTextPath = displayPath;
                
                if (typeof item === 'object' && item !== null) {
                    const identifier = item.name || item.id || item.title || item.key || index;
                    itemTextPath = displayPath ? `${displayPath}[${identifier}]` : `[${identifier}]`;
                } else {
                    itemTextPath = displayPath ? `${displayPath}[${index}]` : `[${index}]`;
                }
                
                html += '<div class="json-item">';
                html += `<span class="json-index json-clickable" data-path="${itemTextPath}" title="Array index: ${index}">${index}:</span> `;
                html += this.createTreeHTML(item, level + 1, itemPath, itemTextPath);
                if (index < obj.length - 1) html += '<span class="json-comma">,</span>';
                html += '</div>';
            });
            
            html += '</div>';
            html += `<span class="json-bracket json-clickable" data-path="${displayPath}">]</span>`;
            html += '</div>';
            return html;
        }
        
        if (typeof obj === 'object') {
            const keys = Object.keys(obj);
            if (keys.length === 0) return `<span class="json-object json-clickable" data-path="${displayPath}" title="Empty object">{}</span>`;
            
            let html = '<div class="json-node">';
            html += '<span class="json-toggle">▼</span>';
            html += `<span class="json-bracket json-clickable" data-path="${displayPath}" title="Object with ${keys.length} properties">{</span>`;
            html += `<span class="json-collapsed" style="display:none;"><span class="json-count">${keys.length} keys</span></span>`;
            html += '<div class="json-children">';
            
            keys.forEach((key, index) => {
                const keyPath = path === '$' ? `$.${key}` : `${path}.${key}`;
                const keyTextPath = displayPath ? `${displayPath}.${key}` : key;
                const valueType = typeof obj[key];
                
                html += '<div class="json-item">';
                html += `<span class="json-key json-clickable" data-path="${keyTextPath}" title="Property: ${key} | Type: ${valueType}">"${key}"</span>: `;
                html += this.createTreeHTML(obj[key], level + 1, keyPath, keyTextPath);
                if (index < keys.length - 1) html += '<span class="json-comma">,</span>';
                html += '</div>';
            });
            
            html += '</div>';
            html += `<span class="json-bracket json-clickable" data-path="${displayPath}">}</span>`;
            html += '</div>';
            return html;
        }
        
        return String(obj);
    }

    setupTreeToggle() {
        document.querySelectorAll('.json-toggle').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                const node = e.target.parentNode;
                const children = node.querySelector('.json-children');
                const collapsed = node.querySelector('.json-collapsed');
                
                if (children && collapsed) {
                    const isCollapsed = children.style.display === 'none';
                    children.style.display = isCollapsed ? 'block' : 'none';
                    collapsed.style.display = isCollapsed ? 'none' : 'inline';
                    e.target.textContent = isCollapsed ? '▼' : '▶';
                }
            });
        });
        
        // Add path explorer click handlers
        document.querySelectorAll('.json-clickable').forEach(element => {
            element.addEventListener('click', (e) => {
                e.stopPropagation();
                const path = e.target.getAttribute('data-path');
                if (path) {
                    this.showPath(path, e.target);
                    // Add visual feedback
                    e.target.style.background = 'rgba(0, 245, 255, 0.2)';
                    setTimeout(() => {
                        e.target.style.background = '';
                    }, 300);
                }
            });
        });
    }

    renderTableView() {
        const container = document.getElementById('tableView');
        container.innerHTML = '<div class="table-container">' + this.createTableHTML(this.jsonData) + '</div>';
    }

    createTableHTML(data) {
        if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
            const keys = Object.keys(data[0]);
            let html = '<table class="json-table">';
            html += '<thead><tr>';
            keys.forEach(key => html += `<th>${key}</th>`);
            html += '</tr></thead><tbody>';
            
            data.forEach(row => {
                html += '<tr>';
                keys.forEach(key => {
                    const value = row[key];
                    html += `<td>${typeof value === 'object' ? JSON.stringify(value) : value}</td>`;
                });
                html += '</tr>';
            });
            
            html += '</tbody></table>';
            return html;
        }
        
        return '<p>Data is not in tabular format</p>';
    }

    renderRawView() {
        const container = document.getElementById('rawView');
        container.innerHTML = `<pre class="json-raw">${JSON.stringify(this.jsonData, null, 2)}</pre>`;
    }

    convertToCSV() {
        if (!this.jsonData) return;
        
        try {
            const csv = this.jsonToCSV(this.jsonData);
            this.downloadFile(csv, 'data.csv', 'text/csv');
            this.showNotification('CSV file downloaded!', 'success');
        } catch (error) {
            this.showNotification('Error converting to CSV', 'error');
        }
    }

    jsonToCSV(data) {
        if (!Array.isArray(data)) {
            data = [data];
        }
        
        const keys = Object.keys(data[0]);
        const csv = [keys.join(',')];
        
        data.forEach(row => {
            const values = keys.map(key => {
                const value = row[key];
                return typeof value === 'object' ? JSON.stringify(value) : value;
            });
            csv.push(values.join(','));
        });
        
        return csv.join('\n');
    }

    convertFromCSV() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv';
        input.onchange = (e) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (e) => this.convertCSVToJSON(e.target.result);
            reader.readAsText(file);
        };
        input.click();
    }

    convertCSVToJSON(csvText) {
        const lines = csvText.split('\n');
        const headers = lines[0].split(',');
        const result = [];
        
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim()) {
                const values = lines[i].split(',');
                const obj = {};
                headers.forEach((header, index) => {
                    obj[header.trim()] = values[index]?.trim() || '';
                });
                result.push(obj);
            }
        }
        
        this.editor.setValue(JSON.stringify(result, null, 2));
        this.showNotification('CSV converted to JSON!', 'success');
    }

    convertToExcel() {
        this.showNotification('Excel export feature coming soon!', 'info');
    }
    
    convertToXML() {
        if (!this.jsonData) return;
        
        const xml = this.jsonToXML(this.jsonData);
        this.downloadFile(xml, 'data.xml', 'application/xml');
        this.showNotification('XML file downloaded!', 'success');
    }
    
    convertToYAML() {
        if (!this.jsonData) return;
        
        const yaml = this.jsonToYAML(this.jsonData);
        this.downloadFile(yaml, 'data.yaml', 'text/yaml');
        this.showNotification('YAML file downloaded!', 'success');
    }
    
    jsonToXML(obj, rootName = 'root') {
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += `<${rootName}>\n`;
        xml += this.objectToXML(obj, 1);
        xml += `</${rootName}>`;
        return xml;
    }
    
    objectToXML(obj, indent = 0) {
        let xml = '';
        const spaces = '  '.repeat(indent);
        
        for (const [key, value] of Object.entries(obj)) {
            if (Array.isArray(value)) {
                value.forEach(item => {
                    xml += `${spaces}<${key}>`;
                    if (typeof item === 'object') {
                        xml += '\n' + this.objectToXML(item, indent + 1) + spaces;
                    } else {
                        xml += item;
                    }
                    xml += `</${key}>\n`;
                });
            } else if (typeof value === 'object' && value !== null) {
                xml += `${spaces}<${key}>\n`;
                xml += this.objectToXML(value, indent + 1);
                xml += `${spaces}</${key}>\n`;
            } else {
                xml += `${spaces}<${key}>${value}</${key}>\n`;
            }
        }
        return xml;
    }
    
    jsonToYAML(obj, indent = 0) {
        let yaml = '';
        const spaces = '  '.repeat(indent);
        
        for (const [key, value] of Object.entries(obj)) {
            if (Array.isArray(value)) {
                yaml += `${spaces}${key}:\n`;
                value.forEach(item => {
                    if (typeof item === 'object') {
                        yaml += `${spaces}- \n`;
                        yaml += this.jsonToYAML(item, indent + 1);
                    } else {
                        yaml += `${spaces}- ${item}\n`;
                    }
                });
            } else if (typeof value === 'object' && value !== null) {
                yaml += `${spaces}${key}:\n`;
                yaml += this.jsonToYAML(value, indent + 1);
            } else {
                yaml += `${spaces}${key}: ${value}\n`;
            }
        }
        return yaml;
    }
    
    validateJSON(silent = false) {
        const value = this.editor?.getValue() || '';
        const statsContainer = document.getElementById('jsonStats');
        
        try {
            JSON.parse(value);
            if (!silent) this.showNotification('JSON is valid!', 'success');
            statsContainer.className = 'json-stats validation-success';
        } catch (error) {
            if (!silent) this.showNotification(`Invalid JSON: ${error.message}`, 'error');
            statsContainer.className = 'json-stats validation-error';
        }
    }
    
    updateStats() {
        const value = this.editor?.getValue() || '';
        const statsContainer = document.getElementById('jsonStats');
        
        if (!value.trim()) {
            statsContainer.innerHTML = '';
            return;
        }
        
        try {
            const parsed = JSON.parse(value);
            const stats = this.calculateStats(parsed, value);
            
            statsContainer.innerHTML = `
                <div class="stat-item">
                    <span class="stat-label">Size:</span>
                    <span class="stat-value">${stats.size} bytes</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Keys:</span>
                    <span class="stat-value">${stats.keys}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Depth:</span>
                    <span class="stat-value">${stats.depth}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Type:</span>
                    <span class="stat-value">${stats.type}</span>
                </div>
            `;
        } catch (error) {
            statsContainer.innerHTML = `<div class="stat-item"><span class="stat-value">Invalid JSON</span></div>`;
        }
    }
    
    calculateStats(obj, jsonString) {
        const size = new Blob([jsonString]).size;
        const type = Array.isArray(obj) ? 'Array' : typeof obj;
        
        let keys = 0;
        let depth = 0;
        
        const countKeys = (o, currentDepth = 1) => {
            depth = Math.max(depth, currentDepth);
            
            if (Array.isArray(o)) {
                keys += o.length;
                o.forEach(item => {
                    if (typeof item === 'object' && item !== null) {
                        countKeys(item, currentDepth + 1);
                    }
                });
            } else if (typeof o === 'object' && o !== null) {
                const objKeys = Object.keys(o);
                keys += objKeys.length;
                objKeys.forEach(key => {
                    if (typeof o[key] === 'object' && o[key] !== null) {
                        countKeys(o[key], currentDepth + 1);
                    }
                });
            }
        };
        
        countKeys(obj);
        
        return { size, keys, depth, type };
    }
    
    renderSchemaView() {
        const container = document.getElementById('schemaView');
        const schema = this.generateSchema(this.jsonData);
        container.innerHTML = `<div class="schema-container">${this.formatSchema(schema)}</div>`;
    }
    
    generateSchema(obj, path = '') {
        if (Array.isArray(obj)) {
            return {
                type: 'array',
                items: obj.length > 0 ? this.generateSchema(obj[0], path + '[0]') : { type: 'unknown' }
            };
        } else if (typeof obj === 'object' && obj !== null) {
            const properties = {};
            Object.keys(obj).forEach(key => {
                properties[key] = this.generateSchema(obj[key], path + '.' + key);
            });
            return {
                type: 'object',
                properties
            };
        } else {
            return { type: typeof obj };
        }
    }
    
    formatSchema(schema, indent = 0) {
        const spaces = '  '.repeat(indent);
        let html = '';
        
        if (schema.type === 'object') {
            html += `${spaces}<span class="schema-type">object</span> {\n`;
            Object.entries(schema.properties).forEach(([key, prop]) => {
                html += `${spaces}  <span class="schema-property">${key}</span>: `;
                html += this.formatSchema(prop, indent + 1);
                html += '\n';
            });
            html += `${spaces}}`;
        } else if (schema.type === 'array') {
            html += `<span class="schema-type">array</span>[`;
            html += this.formatSchema(schema.items, 0);
            html += ']';
        } else {
            html += `<span class="schema-type">${schema.type}</span>`;
        }
        
        return html;
    }
    
    openCompareModal() {
        document.getElementById('compareModal').classList.add('active');
        setTimeout(() => this.initCompareEditors(), 100);
    }
    
    closeCompareModal() {
        document.getElementById('compareModal').classList.remove('active');
    }
    
    initCompareEditors() {
        if (!this.originalEditor) {
            this.originalEditor = monaco.editor.create(document.getElementById('originalEditor'), {
                value: this.editor?.getValue() || '',
                language: 'json',
                theme: document.documentElement.getAttribute('data-theme') === 'light' ? 'vs' : 'vs-dark',
                automaticLayout: true,
                minimap: { enabled: false },
                fontSize: 12,
                lineNumbers: 'on'
            });
        }
        
        if (!this.compareEditor) {
            this.compareEditor = monaco.editor.create(document.getElementById('compareEditor'), {
                value: '',
                language: 'json',
                theme: document.documentElement.getAttribute('data-theme') === 'light' ? 'vs' : 'vs-dark',
                automaticLayout: true,
                minimap: { enabled: false },
                fontSize: 12,
                lineNumbers: 'on'
            });
        }
    }
    
    swapCompareInputs() {
        if (this.originalEditor && this.compareEditor) {
            const originalValue = this.originalEditor.getValue();
            const compareValue = this.compareEditor.getValue();
            
            this.originalEditor.setValue(compareValue);
            this.compareEditor.setValue(originalValue);
        }
    }
    
    runComparison() {
        try {
            const original = JSON.parse(this.originalEditor.getValue());
            const compare = JSON.parse(this.compareEditor.getValue());
            
            const diff = this.compareObjects(original, compare);
            this.displayComparisonResults(diff);
            this.closeCompareModal();
            this.switchView('compare');
            
        } catch (error) {
            this.showNotification('Invalid JSON in one or both editors', 'error');
        }
    }
    
    compareObjects(obj1, obj2, path = '') {
        const differences = [];
        const allKeys = new Set([...Object.keys(obj1 || {}), ...Object.keys(obj2 || {})]);
        
        for (const key of allKeys) {
            const currentPath = path ? `${path}.${key}` : key;
            const val1 = obj1?.[key];
            const val2 = obj2?.[key];
            
            if (!(key in (obj1 || {}))) {
                differences.push({ type: 'added', path: currentPath, value: val2 });
            } else if (!(key in (obj2 || {}))) {
                differences.push({ type: 'removed', path: currentPath, value: val1 });
            } else if (typeof val1 === 'object' && typeof val2 === 'object' && val1 !== null && val2 !== null) {
                differences.push(...this.compareObjects(val1, val2, currentPath));
            } else if (val1 !== val2) {
                differences.push({ type: 'modified', path: currentPath, oldValue: val1, newValue: val2 });
            }
        }
        
        return differences;
    }
    
    displayComparisonResults(differences) {
        const container = document.getElementById('compareView');
        
        if (differences.length === 0) {
            container.innerHTML = '<div class="compare-results"><p>No differences found. The JSON objects are identical.</p></div>';
            return;
        }
        
        const stats = {
            added: differences.filter(d => d.type === 'added').length,
            removed: differences.filter(d => d.type === 'removed').length,
            modified: differences.filter(d => d.type === 'modified').length
        };
        
        let html = `
            <div class="compare-results">
                <div class="diff-summary">
                    <h4>Comparison Summary</h4>
                    <div class="diff-stats">
                        <div class="diff-stat diff-stat-added">+${stats.added} Added</div>
                        <div class="diff-stat diff-stat-removed">-${stats.removed} Removed</div>
                        <div class="diff-stat diff-stat-modified">${stats.modified} Modified</div>
                    </div>
                </div>
                <div class="diff-details">
        `;
        
        differences.forEach(diff => {
            const className = `diff-${diff.type}`;
            if (diff.type === 'modified') {
                html += `
                    <div class="${className}">
                        <strong>${diff.path}:</strong> 
                        <span class="diff-removed">${JSON.stringify(diff.oldValue)}</span> → 
                        <span class="diff-added">${JSON.stringify(diff.newValue)}</span>
                    </div>
                `;
            } else {
                html += `
                    <div class="${className}">
                        <strong>${diff.path}:</strong> ${JSON.stringify(diff.value)}
                    </div>
                `;
            }
        });
        
        html += '</div></div>';
        container.innerHTML = html;
    }
    
    renderQueryView() {
        const container = document.getElementById('queryView');
        container.innerHTML = `
            <div class="query-builder">
                <div class="query-input-section">
                    <label>JSONPath Query:</label>
                    <input type="text" id="queryInput" placeholder="$.personalInfo.name" class="query-input">
                    <button id="runQuery" class="btn btn-primary">Run Query</button>
                </div>
                <div class="query-examples">
                    <h4>Quick Examples:</h4>
                    <div class="example-queries">
                        <button class="example-btn" data-query="$.personalInfo.name">Get Name</button>
                        <button class="example-btn" data-query="$.skills[*]">All Skills</button>
                        <button class="example-btn" data-query="$..name">All Names</button>
                        <button class="example-btn" data-query="$.experience[0].company">First Company</button>
                    </div>
                </div>
                <div class="query-results" id="queryResults">
                    <p>Enter a JSONPath query above to extract data from your JSON.</p>
                </div>
            </div>
        `;
        
        // Add event listeners
        document.getElementById('runQuery').addEventListener('click', this.executeQuery.bind(this));
        document.getElementById('queryInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.executeQuery();
        });
        
        document.querySelectorAll('.example-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const query = e.target.getAttribute('data-query');
                document.getElementById('queryInput').value = query;
                this.executeQuery();
            });
        });
    }
    
    executeQuery() {
        const query = document.getElementById('queryInput').value.trim();
        const resultsContainer = document.getElementById('queryResults');
        
        if (!query || !this.jsonData) {
            resultsContainer.innerHTML = '<p>Please enter a query and ensure JSON data is loaded.</p>';
            return;
        }
        
        try {
            const result = this.evaluateJSONPath(query, this.jsonData);
            resultsContainer.innerHTML = `
                <div class="query-result-header">
                    <h4>Query Result:</h4>
                    <button onclick="navigator.clipboard.writeText('${JSON.stringify(result, null, 2)}')" class="btn btn-secondary">Copy Result</button>
                </div>
                <pre class="query-result-content">${JSON.stringify(result, null, 2)}</pre>
            `;
        } catch (error) {
            resultsContainer.innerHTML = `<div class="query-error">Error: ${error.message}</div>`;
        }
    }
    
    evaluateJSONPath(path, data) {
        // Simple JSONPath evaluator for basic queries
        if (path === '$') return data;
        
        const parts = path.replace(/^\$\.?/, '').split(/[.\[\]]/).filter(p => p);
        let result = data;
        
        for (const part of parts) {
            if (part === '*') {
                if (Array.isArray(result)) {
                    result = result.flat();
                } else if (typeof result === 'object') {
                    result = Object.values(result);
                }
            } else if (part.includes('*')) {
                // Handle wildcard in arrays
                if (Array.isArray(result)) {
                    result = result.map(item => item[part.replace('*', '')]);
                }
            } else if (!isNaN(part)) {
                result = result[parseInt(part)];
            } else {
                result = result[part];
            }
            
            if (result === undefined) break;
        }
        
        return result;
    }

    renderCompareView() {
        const container = document.getElementById('compareView');
        container.innerHTML = '<div class="compare-results"><p>Use the Compare button to compare two JSON objects.</p></div>';
    }

    clearAll() {
        this.editor.setValue('');
        document.querySelectorAll('.view-content').forEach(view => view.innerHTML = '');
        this.showNotification('All data cleared!', 'success');
    }

    downloadFile(content, filename, contentType) {
        const blob = new Blob([content], { type: contentType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    searchJSON(query) {
        if (!query.trim()) {
            this.updateViews();
            this.searchMatches = [];
            this.currentMatchIndex = 0;
            return;
        }
        
        let hasMatches = false;
        
        // Search in Monaco editor
        if (this.editor) {
            const model = this.editor.getModel();
            this.searchMatches = model.findMatches(query, false, false, true, null, false);
            this.currentMatchIndex = 0;
            
            if (this.searchMatches.length > 0) {
                this.showSearchNavigation(this.searchMatches.length);
                this.navigateToMatch(0);
                hasMatches = true;
            } else {
                document.getElementById('searchNavigation').style.display = 'none';
            }
        }
        
        // Search in views
        if (this.currentView === 'tree') {
            const treeMatches = this.searchInTreeView(query);
            hasMatches = hasMatches || treeMatches;
        } else if (this.currentView === 'raw') {
            const rawMatches = this.searchInRawView(query);
            hasMatches = hasMatches || rawMatches;
        }
        
        // Show notification only if no matches found anywhere
        if (!hasMatches) {
            this.showNotification('No matches found', 'info');
        }
    }
    
    showSearchNavigation(totalMatches) {
        const navigation = document.getElementById('searchNavigation');
        const counter = document.getElementById('searchCounter');
        const prevBtn = document.getElementById('searchPrev');
        const nextBtn = document.getElementById('searchNext');
        
        navigation.style.display = 'flex';
        counter.textContent = `${this.currentMatchIndex + 1}/${totalMatches}`;
        
        prevBtn.disabled = this.currentMatchIndex === 0;
        nextBtn.disabled = this.currentMatchIndex === totalMatches - 1;
    }
    
    navigateSearch(direction) {
        if (this.searchMatches.length === 0) return;
        
        this.currentMatchIndex += direction;
        
        if (this.currentMatchIndex < 0) {
            this.currentMatchIndex = this.searchMatches.length - 1;
        } else if (this.currentMatchIndex >= this.searchMatches.length) {
            this.currentMatchIndex = 0;
        }
        
        this.navigateToMatch(this.currentMatchIndex);
        this.showSearchNavigation(this.searchMatches.length);
    }
    
    navigateToMatch(index) {
        if (this.searchMatches[index] && this.editor) {
            const match = this.searchMatches[index];
            this.editor.setSelection(match.range);
            this.editor.revealRangeInCenter(match.range);
        }
    }
    
    searchInTreeView(query) {
        const container = document.getElementById('treeView');
        const items = container.querySelectorAll('.json-item, .json-key, .json-string, .json-number');
        let firstMatch = null;
        let matchCount = 0;
        
        items.forEach(item => {
            item.classList.remove('search-highlight');
            if (item.textContent.toLowerCase().includes(query.toLowerCase())) {
                item.classList.add('search-highlight');
                matchCount++;
                if (!firstMatch) firstMatch = item;
            }
        });
        
        // Scroll to first match
        if (firstMatch) {
            firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        
        return matchCount > 0;
    }
    
    searchInRawView(query) {
        const container = document.getElementById('rawView');
        const pre = container.querySelector('pre');
        if (!pre) return false;
        
        const text = pre.textContent;
        const regex = new RegExp(`(${query})`, 'gi');
        const matches = text.match(regex);
        const highlightedText = text.replace(regex, '<mark class="search-match">$1</mark>');
        pre.innerHTML = highlightedText;
        
        // Scroll to first match
        const firstMatch = pre.querySelector('.search-match');
        if (firstMatch) {
            firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        
        return matches && matches.length > 0;
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        const colors = {
            success: { bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)', glow: '0 0 20px rgba(16, 185, 129, 0.4)' },
            error: { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.3)', glow: '0 0 20px rgba(239, 68, 68, 0.4)' },
            info: { bg: 'rgba(0, 245, 255, 0.15)', border: 'rgba(0, 245, 255, 0.3)', glow: '0 0 20px rgba(0, 245, 255, 0.4)' }
        };
        
        const color = colors[type] || colors.info;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            background: ${color.bg};
            backdrop-filter: blur(20px);
            border: 1px solid ${color.border};
            border-radius: 12px;
            color: var(--text-primary);
            z-index: 1000;
            transform: translateX(100%);
            transition: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), ${color.glow};
            font-weight: 500;
        `;
        
        document.body.appendChild(notification);
        
        // Add entrance animation
        setTimeout(() => {
            notification.style.transform = 'translateX(0) scale(1)';
            notification.style.animation = 'fadeInRight 0.4s ease-out';
        }, 100);
        
        // Add exit animation
        setTimeout(() => {
            notification.style.animation = 'fadeOutRight 0.3s ease-in';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new JSONViewPro();
});

// Add some additional CSS for table and notifications
const additionalStyles = `
.json-table {
    width: 100%;
    border-collapse: collapse;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.875rem;
}

.json-table th,
.json-table td {
    padding: 0.75rem;
    text-align: left;
    border-bottom: 1px solid var(--border-color);
}

.json-table th {
    background: var(--bg-tertiary);
    font-weight: 600;
    color: var(--accent-cyan);
}

.json-raw {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.875rem;
    line-height: 1.6;
    color: var(--text-primary);
    white-space: pre-wrap;
    word-wrap: break-word;
}



.search-highlight {
    background: rgba(0, 245, 255, 0.2);
    border-radius: 4px;
    padding: 2px 4px;
    animation: searchPulse 1s ease-in-out;
}

.search-match {
    background: var(--accent-cyan);
    color: var(--bg-primary);
    padding: 2px 4px;
    border-radius: 4px;
    font-weight: 600;
}

@keyframes searchPulse {
    0%, 100% { background: rgba(0, 245, 255, 0.2); }
    50% { background: rgba(0, 245, 255, 0.4); }
}
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);