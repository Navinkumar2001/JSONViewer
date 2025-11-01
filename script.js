class JSONViewPro {
    constructor() {
        this.editor = null;
        this.currentView = 'tree';
        this.jsonData = null;
        this.searchMatches = [];
        this.currentMatchIndex = 0;
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
        const sampleJSON = {
            "user": {
                "id": 12345,
                "name": "John Doe",
                "email": "john.doe@example.com",
                "active": true,
                "profile": {
                    "age": 30,
                    "location": "San Francisco",
                    "skills": ["JavaScript", "Python", "React"],
                    "preferences": {
                        "theme": "dark",
                        "notifications": true
                    }
                },
                "orders": [
                    {
                        "id": "ORD-001",
                        "amount": 99.99,
                        "date": "2024-01-15"
                    },
                    {
                        "id": "ORD-002",
                        "amount": 149.50,
                        "date": "2024-01-20"
                    }
                ]
            }
        };
        
        setTimeout(() => {
            if (this.editor) {
                this.editor.setValue(JSON.stringify(sampleJSON, null, 2));
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

    createTreeHTML(obj, level = 0) {
        if (obj === null) return '<span class="json-null">null</span>';
        if (typeof obj === 'string') return `<span class="json-string">"${obj}"</span>`;
        if (typeof obj === 'number') return `<span class="json-number">${obj}</span>`;
        if (typeof obj === 'boolean') return `<span class="json-boolean">${obj}</span>`;
        
        if (Array.isArray(obj)) {
            if (obj.length === 0) return '<span class="json-array">[]</span>';
            
            let html = '<div class="json-node">';
            html += '<span class="json-toggle">▼</span>';
            html += '<span class="json-bracket">[</span>';
            html += `<span class="json-collapsed" style="display:none;"><span class="json-count">${obj.length} items</span></span>`;
            html += '<div class="json-children">';
            
            obj.forEach((item, index) => {
                html += '<div class="json-item">';
                html += `<span class="json-index">${index}:</span> `;
                html += this.createTreeHTML(item, level + 1);
                if (index < obj.length - 1) html += '<span class="json-comma">,</span>';
                html += '</div>';
            });
            
            html += '</div>';
            html += '<span class="json-bracket">]</span>';
            html += '</div>';
            return html;
        }
        
        if (typeof obj === 'object') {
            const keys = Object.keys(obj);
            if (keys.length === 0) return '<span class="json-object">{}</span>';
            
            let html = '<div class="json-node">';
            html += '<span class="json-toggle">▼</span>';
            html += '<span class="json-bracket">{</span>';
            html += `<span class="json-collapsed" style="display:none;"><span class="json-count">${keys.length} keys</span></span>`;
            html += '<div class="json-children">';
            
            keys.forEach((key, index) => {
                html += '<div class="json-item">';
                html += `<span class="json-key">"${key}"</span>: `;
                html += this.createTreeHTML(obj[key], level + 1);
                if (index < keys.length - 1) html += '<span class="json-comma">,</span>';
                html += '</div>';
            });
            
            html += '</div>';
            html += '<span class="json-bracket">}</span>';
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
        
        // Search in Monaco editor
        if (this.editor) {
            const model = this.editor.getModel();
            this.searchMatches = model.findMatches(query, false, false, true, null, false);
            this.currentMatchIndex = 0;
            
            if (this.searchMatches.length > 0) {
                this.showSearchNavigation(this.searchMatches.length);
                this.navigateToMatch(0);
            } else {
                document.getElementById('searchNavigation').style.display = 'none';
                this.showNotification('No matches found', 'info');
            }
        }
        
        // Search in views
        if (this.currentView === 'tree') {
            this.searchInTreeView(query);
        } else if (this.currentView === 'raw') {
            this.searchInRawView(query);
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
        
        items.forEach(item => {
            item.classList.remove('search-highlight');
            if (item.textContent.toLowerCase().includes(query.toLowerCase())) {
                item.classList.add('search-highlight');
                if (!firstMatch) firstMatch = item;
            }
        });
        
        // Scroll to first match
        if (firstMatch) {
            firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
    
    searchInRawView(query) {
        const container = document.getElementById('rawView');
        const pre = container.querySelector('pre');
        if (!pre) return;
        
        const text = pre.textContent;
        const regex = new RegExp(`(${query})`, 'gi');
        const highlightedText = text.replace(regex, '<mark class="search-match">$1</mark>');
        pre.innerHTML = highlightedText;
        
        // Scroll to first match
        const firstMatch = pre.querySelector('.search-match');
        if (firstMatch) {
            firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            background: var(--glass-bg);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 12px;
            color: var(--text-primary);
            z-index: 1000;
            transform: translateX(100%);
            transition: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
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

.notification-success {
    border-left: 4px solid #10b981;
}

.notification-error {
    border-left: 4px solid #ef4444;
}

.notification-info {
    border-left: 4px solid var(--accent-cyan);
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