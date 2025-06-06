const AppState = {
    components: [],
    games: [],
    currentAssembly: [],
    draggedElement: null,
    currentTab: 'component-creator'
};

const BASIC_SHAPES = [
    { name: 'Quadrado', icon: '⬜', color: '#FF6B6B' },
    { name: 'Retângulo', icon: '▭', color: '#4ECDC4' },
    { name: 'Círculo', icon: '⭕', color: '#45B7D1' },
    { name: 'Losango', icon: '🔶', color: '#96CEB4' },
    { name: 'Hexágono', icon: '⬡', color: '#FFEAA7' },
    { name: 'Pentágono', icon: '⬟', color: '#DDA0DD' },
    { name: 'Triângulo', icon: '🔺', color: '#FFD93D' },
    { name: 'Cruz', icon: '✚', color: '#6C5CE7' },
    { name: 'Estrela', icon: '⭐', color: '#A29BFE' },
    { name: 'Diamante', icon: '💎', color: '#FD79A8' },
    { name: 'Paralelogramo', icon: '▱', color: '#E17055' },
    { name: 'Cubo', icon: '⬛', color: '#00B894' },
    { name: 'Prisma', icon: '▬', color: '#74B9FF' },
    { name: 'Triângulo Retângulo', icon: '◣', color: '#FDCB6E' },
    { name: 'Coração', icon: '♥', color: '#E84393' }
];

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    generateShapes();
    loadSavedData();
});

function initializeApp() {
    console.log('Inicializando Montador de Jogos...');
    
    showTab('component-creator');
}

function setupEventListeners() {
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            showTab(tabId);
        });
    });

    document.getElementById('clearShapeAssembly')?.addEventListener('click', clearShapeAssembly);
    document.getElementById('saveComponent')?.addEventListener('click', showComponentForm);
    document.getElementById('confirmComponent')?.addEventListener('click', saveComponent);

    document.getElementById('clearGameAssembly')?.addEventListener('click', clearGameAssembly);
    document.getElementById('saveGame')?.addEventListener('click', showGameForm);
    document.getElementById('confirmGame')?.addEventListener('click', saveGame);

    setupDropZones();
}

function showTab(tabId) {
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
    document.getElementById(tabId).classList.add('active');
    
    AppState.currentTab = tabId;
    
    if (tabId === 'game-creator') {
        updateComponentsSelection();
    }
}

function generateShapes() {
    const shapesGrid = document.getElementById('shapesGrid');
    if (!shapesGrid) return;

    shapesGrid.innerHTML = '';
    
    BASIC_SHAPES.forEach((shape, index) => {
        const shapeElement = createShapeElement(shape, index);
        shapesGrid.appendChild(shapeElement);
    });
}

function createShapeElement(shape, index) {
    const shapeDiv = document.createElement('div');
    shapeDiv.className = 'shape';
    shapeDiv.draggable = true;
    shapeDiv.style.borderColor = shape.color;
    shapeDiv.dataset.shapeIndex = index;
    
    shapeDiv.innerHTML = `
        <div class="shape-icon">${shape.icon}</div>
        <div class="shape-name">${shape.name}</div>
    `;
    
    shapeDiv.addEventListener('dragstart', (e) => {
        AppState.draggedElement = {
            type: 'shape',
            data: shape,
            index: index
        };
        e.dataTransfer.effectAllowed = 'copy';
    });
    
    return shapeDiv;
}

function setupDropZones() {
    const shapeAssemblyArea = document.getElementById('shapeAssemblyArea');
    const gameAssemblyArea = document.getElementById('gameAssemblyArea');
    
    [shapeAssemblyArea, gameAssemblyArea].forEach(area => {
        if (!area) return;
        
        area.addEventListener('dragover', (e) => {
            e.preventDefault();
            area.classList.add('dragover');
        });
        
        area.addEventListener('dragleave', (e) => {
            if (!area.contains(e.relatedTarget)) {
                area.classList.remove('dragover');
            }
        });
        
        area.addEventListener('drop', (e) => {
            e.preventDefault();
            area.classList.remove('dragover');
            handleDrop(e, area);
        });
    });
}

function handleDrop(e, dropArea) {
    if (!AppState.draggedElement) return;
    
    const rect = dropArea.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (dropArea.id === 'shapeAssemblyArea' && AppState.draggedElement.type === 'shape') {
        addShapeToAssembly(AppState.draggedElement.data, x, y);
    } else if (dropArea.id === 'gameAssemblyArea' && AppState.draggedElement.type === 'component') {
        addComponentToGameAssembly(AppState.draggedElement.data, x, y);
    }
    
    AppState.draggedElement = null;
}

function addShapeToAssembly(shape, x, y) {
    const assemblyArea = document.getElementById('shapeAssemblyArea');
    const shapeElement = document.createElement('div');
    
    const shapeId = 'shape_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    shapeElement.className = 'assembly-shape';
    shapeElement.style.left = Math.max(0, Math.min(x - 25, assemblyArea.clientWidth - 50)) + 'px';
    shapeElement.style.top = Math.max(0, Math.min(y - 25, assemblyArea.clientHeight - 50)) + 'px';
    shapeElement.style.color = shape.color;
    shapeElement.dataset.shapeId = shapeId;
    shapeElement.innerHTML = `
        <div style="font-size: 1.5rem;">${shape.icon}</div>
        <div style="font-size: 0.7rem;">${shape.name}</div>
    `;
    
    makeDraggableInAssembly(shapeElement);
    
    assemblyArea.appendChild(shapeElement);
    
    AppState.currentAssembly.push({
        id: shapeId,
        type: 'shape',
        data: shape,
        x: parseInt(shapeElement.style.left),
        y: parseInt(shapeElement.style.top)
    });
    
    updateComponentPreview();
}

function makeDraggableInAssembly(element) {
    let isDragging = false;
    let startX, startY, initialX, initialY;
    
    element.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        initialX = parseInt(element.style.left);
        initialY = parseInt(element.style.top);
        element.style.zIndex = 1000;
        
        e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        
        const newX = initialX + deltaX;
        const newY = initialY + deltaY;
        
        const parent = element.parentElement;
        const maxX = parent.clientWidth - element.offsetWidth;
        const maxY = parent.clientHeight - element.offsetHeight;
        
        element.style.left = Math.max(0, Math.min(newX, maxX)) + 'px';
        element.style.top = Math.max(0, Math.min(newY, maxY)) + 'px';
    });
    
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            element.style.zIndex = 10;
            
            const shapeId = element.dataset.shapeId || element.dataset.componentId;
            const item = AppState.currentAssembly.find(item => item.id === shapeId);
            if (item) {
                item.x = parseInt(element.style.left);
                item.y = parseInt(element.style.top);
            }
            
            if (AppState.currentTab === 'component-creator') {
                updateComponentPreview();
            } else {
                updateGamePreview();
            }
        }
    });
    
    element.addEventListener('dblclick', () => {
        const shapeId = element.dataset.shapeId || element.dataset.componentId;
        AppState.currentAssembly = AppState.currentAssembly.filter(item => item.id !== shapeId);
        element.remove();
        
        if (AppState.currentTab === 'component-creator') {
            updateComponentPreview();
        } else {
            updateGamePreview();
        }
    });
}

function clearShapeAssembly() {
    const assemblyArea = document.getElementById('shapeAssemblyArea');
    assemblyArea.innerHTML = '';
    AppState.currentAssembly = [];
    updateComponentPreview();
}

function clearGameAssembly() {
    const assemblyArea = document.getElementById('gameAssemblyArea');
    assemblyArea.innerHTML = '';
    AppState.currentAssembly = [];
    updateGamePreview();
}

function updateComponentPreview() {
    const preview = document.getElementById('componentPreview');
    
    if (AppState.currentAssembly.length === 0) {
        preview.innerHTML = '<p>Arraste formas para a área de montagem para criar um componente</p>';
        return;
    }
    
    const shapeCounts = {};
    AppState.currentAssembly.forEach(item => {
        if (item.type === 'shape') {
            const shapeName = item.data.name;
            shapeCounts[shapeName] = (shapeCounts[shapeName] || 0) + 1;
        }
    });
    
    const shapeTags = Object.entries(shapeCounts).map(([name, count]) => {
        const shape = BASIC_SHAPES.find(s => s.name === name);
        return `<span class="shape-tag">${shape.icon} ${name} (${count})</span>`;
    }).join('');
    
    preview.innerHTML = `
        <div class="assembled-shapes">
            ${shapeTags}
        </div>
        <p><strong>Total de peças:</strong> ${AppState.currentAssembly.length}</p>
    `;
}

function showComponentForm() {
    if (AppState.currentAssembly.length === 0) {
        alert('Adicione pelo menos uma forma antes de criar o componente!');
        return;
    }
    
    const form = document.getElementById('componentForm');
    form.classList.remove('hidden');
    
    const mainShape = AppState.currentAssembly[0].data.name;
    document.getElementById('componentName').value = `Peça ${mainShape}`;
}

function saveComponent() {
    const name = document.getElementById('componentName').value.trim();
    const icon = document.getElementById('componentIcon').value.trim();
    const category = document.getElementById('componentCategory').value;
    
    if (!name) {
        alert('Por favor, digite um nome para o componente!');
        return;
    }
    
    const component = {
        id: 'comp_' + Date.now(),
        name: name,
        icon: icon || '🔧',
        category: category,
        shapes: [...AppState.currentAssembly],
        createdAt: new Date().toISOString()
    };
    
    AppState.components.push(component);
    updateComponentsLibrary();
    
    clearShapeAssembly();
    document.getElementById('componentForm').classList.add('hidden');
    document.getElementById('componentName').value = '';
    document.getElementById('componentIcon').value = '';
    
    alert(`Componente "${name}" criado com sucesso!`);
    saveToLocalStorage();
}

function updateComponentsLibrary() {
    const grid = document.getElementById('componentsGrid');
    
    if (AppState.components.length === 0) {
        grid.innerHTML = '<p>Seus componentes criados aparecerão aqui</p>';
        return;
    }
    
    grid.innerHTML = AppState.components.map(component => {
        const shapeCounts = {};
        component.shapes.forEach(item => {
            if (item.type === 'shape') {
                const shapeName = item.data.name;
                shapeCounts[shapeName] = (shapeCounts[shapeName] || 0) + 1;
            }
        });
        
        const shapesText = Object.entries(shapeCounts)
            .map(([name, count]) => `${name} (${count})`)
            .join(', ');
        
        return `
            <div class="component-card" data-component-id="${component.id}">
                <div class="component-header">
                    <span class="component-icon">${component.icon}</span>
                    <span class="component-name">${component.name}</span>
                </div>
                <div class="component-category">${component.category}</div>
                <div class="component-shapes">${shapesText}</div>
                <div style="margin-top: 0.8rem; display: flex; gap: 0.5rem;">
                    <button class="button" style="font-size: 0.8rem; padding: 0.4rem 0.8rem; background-color: #00B894; color: white;" 
                            onclick="exportComponentToSVG('${component.id}')">
                        📄 SVG
                    </button>
                    <button class="button" style="font-size: 0.8rem; padding: 0.4rem 0.8rem; background-color: #E17055; color: white;" 
                            onclick="duplicateComponent('${component.id}')">
                        📋 Copiar
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function updateComponentsSelection() {
    const selection = document.getElementById('componentsSelection');
    
    if (AppState.components.length === 0) {
        selection.innerHTML = '<p>Crie componentes primeiro para montar jogos</p>';
        return;
    }
    
    selection.innerHTML = AppState.components.map(component => {
        const div = document.createElement('div');
        div.className = 'component-item';
        div.draggable = true;
        div.dataset.componentId = component.id;
        div.innerHTML = `
            <div style="font-size: 2rem; margin-bottom: 0.5rem;">${component.icon}</div>
            <div style="font-weight: 600;">${component.name}</div>
            <div style="font-size: 0.8rem; color: #777;">${component.category}</div>
        `;
        
        div.addEventListener('dragstart', (e) => {
            AppState.draggedElement = {
                type: 'component',
                data: component
            };
            e.dataTransfer.effectAllowed = 'copy';
        });
        
        return div.outerHTML;
    }).join('');
    
    selection.querySelectorAll('.component-item').forEach(item => {
        item.addEventListener('dragstart', (e) => {
            const componentId = item.dataset.componentId;
            const component = AppState.components.find(c => c.id === componentId);
            AppState.draggedElement = {
                type: 'component',
                data: component
            };
            e.dataTransfer.effectAllowed = 'copy';
        });
    });
}

function addComponentToGameAssembly(component, x, y) {
    const assemblyArea = document.getElementById('gameAssemblyArea');
    const componentElement = document.createElement('div');
    
    const componentId = 'gamecomp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    componentElement.className = 'assembly-component';
    componentElement.style.left = Math.max(0, Math.min(x - 40, assemblyArea.clientWidth - 80)) + 'px';
    componentElement.style.top = Math.max(0, Math.min(y - 40, assemblyArea.clientHeight - 80)) + 'px';
    componentElement.style.borderColor = '#2575fc';
    componentElement.dataset.componentId = componentId;
    componentElement.innerHTML = `
        <div style="font-size: 1.8rem;">${component.icon}</div>
        <div style="font-size: 0.8rem; text-align: center;">${component.name}</div>
    `;
    
    makeDraggableInAssembly(componentElement);
    assemblyArea.appendChild(componentElement);
    
    AppState.currentAssembly.push({
        id: componentId,
        type: 'component',
        data: component,
        x: parseInt(componentElement.style.left),
        y: parseInt(componentElement.style.top)
    });
    
    updateGamePreview();
}

function updateGamePreview() {
    const preview = document.getElementById('gamePreview');
    
    if (AppState.currentAssembly.length === 0) {
        preview.innerHTML = '<p>Arraste componentes para a área de montagem para criar um jogo</p>';
        return;
    }
    
    const componentCounts = {};
    AppState.currentAssembly.forEach(item => {
        if (item.type === 'component') {
            const componentName = item.data.name;
            componentCounts[componentName] = (componentCounts[componentName] || 0) + 1;
        }
    });
    
    const componentTags = Object.entries(componentCounts).map(([name, count]) => {
        const component = AppState.components.find(c => c.name === name);
        return `<span class="component-tag">${component.icon} ${name} (${count})</span>`;
    }).join('');
    
    preview.innerHTML = `
        <div class="assembled-components">
            ${componentTags}
        </div>
        <p><strong>Total de componentes:</strong> ${AppState.currentAssembly.length}</p>
    `;
}

function showGameForm() {
    if (AppState.currentAssembly.length === 0) {
        alert('Adicione pelo menos um componente antes de criar o jogo!');
        return;
    }
    
    const form = document.getElementById('gameForm');
    form.classList.remove('hidden');
    
    const mainComponent = AppState.currentAssembly[0].data.name;
    document.getElementById('gameName').value = `Jogo com ${mainComponent}`;
}

function saveGame() {
    const name = document.getElementById('gameName').value.trim();
    const description = document.getElementById('gameDescription').value.trim();
    
    if (!name) {
        alert('Por favor, digite um nome para o jogo!');
        return;
    }
    
    const game = {
        id: 'game_' + Date.now(),
        name: name,
        description: description || 'Jogo criado com componentes personalizados',
        components: [...AppState.currentAssembly],
        createdAt: new Date().toISOString()
    };
    
    AppState.games.push(game);
    updateGamesLibrary();
    
    clearGameAssembly();
    document.getElementById('gameForm').classList.add('hidden');
    document.getElementById('gameName').value = '';
    document.getElementById('gameDescription').value = '';
    
    alert(`Jogo "${name}" criado com sucesso!`);
    saveToLocalStorage();
}

function updateGamesLibrary() {
    const grid = document.getElementById('gamesGrid');
    
    if (AppState.games.length === 0) {
        grid.innerHTML = '<p>Seus jogos criados aparecerão aqui</p>';
        return;
    }
    
    grid.innerHTML = AppState.games.map(game => {
        const componentCounts = {};
        game.components.forEach(item => {
            if (item.type === 'component') {
                const componentName = item.data.name;
                componentCounts[componentName] = (componentCounts[componentName] || 0) + 1;
            }
        });
        
        const componentChips = Object.entries(componentCounts).map(([name, count]) => {
            const component = AppState.components.find(c => c.name === name);
            return `<span class="component-chip">${component?.icon || '🔧'} ${name} (${count})</span>`;
        }).join('');
        
        return `
            <div class="game-card">
                <div class="game-title">${game.name}</div>
                <div class="game-description">${game.description}</div>
                <div class="game-components">
                    <h4>Componentes utilizados:</h4>
                    <div class="components-chips">
                        ${componentChips}
                    </div>
                </div>
                <div class="game-actions">
                    <button class="button" style="background-color: #00B894; margin-right: 0.5rem;" onclick="exportGameToSVG('${game.id}')">
                        📄 Exportar SVG
                    </button>
                    <button class="button button-secondary" onclick="duplicateGame('${game.id}')">
                        📋 Duplicar
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function duplicateComponent(componentId) {
    const component = AppState.components.find(c => c.id === componentId);
    if (!component) return;

    const newComponent = {
        ...component,
        id: 'comp_' + Date.now(),
        name: component.name + ' (Cópia)',
        createdAt: new Date().toISOString()
    };

    AppState.components.push(newComponent);
    updateComponentsLibrary();
    saveToLocalStorage();
    alert(`Componente "${newComponent.name}" duplicado com sucesso!`);
}

function duplicateGame(gameId) {
    const game = AppState.games.find(g => g.id === gameId);
    if (!game) return;
    
    const newGame = {
        ...game,
        id: 'game_' + Date.now(),
        name: game.name + ' (Cópia)',
        createdAt: new Date().toISOString()
    };
    
    AppState.games.push(newGame);
    updateGamesLibrary();
    saveToLocalStorage();
    alert(`Jogo "${newGame.name}" duplicado com sucesso!`);
}

function saveToLocalStorage() {
    try {
        const data = {
            components: AppState.components,
            games: AppState.games
        };
        localStorage.setItem('gameBuilderData', JSON.stringify(data));
    } catch (error) {
        console.error('Erro ao salvar dados:', error);
    }
}

function loadSavedData() {
    try {
        const saved = localStorage.getItem('gameBuilderData');
        if (saved) {
            const data = JSON.parse(saved);
            AppState.components = data.components || [];
            AppState.games = data.games || [];
            
            updateComponentsLibrary();
            updateGamesLibrary();
            updateComponentsSelection();
        }
    } catch (error) {
        console.error('Erro ao carregar dados salvos:', error);
    }
}

function formatDate(isoString) {
    return new Date(isoString).toLocaleDateString('pt-BR');
}

function exportData() {
    const data = {
        components: AppState.components,
        games: AppState.games,
        exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'meus-jogos-' + new Date().toISOString().split('T')[0] + '.json';
    a.click();
    URL.revokeObjectURL(url);
}

window.AppState = AppState;
window.exportData = exportData;

const SVG_CONFIG = {
    scale: 2,
    strokeWidth: 0.5,
    strokeColor: '#000000',
    fillColor: 'none',
    padding: 10
};

function shapeToSVG(shape, x, y, scale = 1) {
    const size = 20 * scale;
    const halfSize = size / 2;
    const cx = x + halfSize;
    const cy = y + halfSize;
    
    const svgProps = `stroke="${SVG_CONFIG.strokeColor}" stroke-width="${SVG_CONFIG.strokeWidth}" fill="${SVG_CONFIG.fillColor}"`;
    
    switch (shape.name) {
        case 'Quadrado':
            return `<rect x="${x}" y="${y}" width="${size}" height="${size}" ${svgProps}/>`;
            
        case 'Retângulo':
            return `<rect x="${x}" y="${y}" width="${size * 1.6}" height="${size}" ${svgProps}/>`;
            
        case 'Círculo':
            return `<circle cx="${cx}" cy="${cy}" r="${halfSize}" ${svgProps}/>`;
            
        case 'Losango':
            const diamondPoints = `${cx},${y} ${x + size},${cy} ${cx},${y + size} ${x},${cy}`;
            return `<polygon points="${diamondPoints}" ${svgProps}/>`;
            
        case 'Hexágono':
            const hexPoints = [];
            for (let i = 0; i < 6; i++) {
                const angle = (i * Math.PI) / 3;
                const hx = cx + halfSize * Math.cos(angle);
                const hy = cy + halfSize * Math.sin(angle);
                hexPoints.push(`${hx},${hy}`);
            }
            return `<polygon points="${hexPoints.join(' ')}" ${svgProps}/>`;
            
        case 'Pentágono':
            const pentPoints = [];
            for (let i = 0; i < 5; i++) {
                const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
                const px = cx + halfSize * Math.cos(angle);
                const py = cy + halfSize * Math.sin(angle);
                pentPoints.push(`${px},${py}`);
            }
            return `<polygon points="${pentPoints.join(' ')}" ${svgProps}/>`;
            
        case 'Triângulo':
            const triPoints = `${cx},${y} ${x + size},${y + size} ${x},${y + size}`;
            return `<polygon points="${triPoints}" ${svgProps}/>`;
            
        case 'Cruz':
            const crossWidth = size * 0.3;
            return `<g ${svgProps}>
                <rect x="${cx - crossWidth/2}" y="${y}" width="${crossWidth}" height="${size}"/>
                <rect x="${x}" y="${cy - crossWidth/2}" width="${size}" height="${crossWidth}"/>
            </g>`;
            
        case 'Estrela':
            const starPoints = [];
            const outerRadius = halfSize;
            const innerRadius = halfSize * 0.4;
            for (let i = 0; i < 10; i++) {
                const angle = (i * Math.PI) / 5 - Math.PI / 2;
                const radius = i % 2 === 0 ? outerRadius : innerRadius;
                const sx = cx + radius * Math.cos(angle);
                const sy = cy + radius * Math.sin(angle);
                starPoints.push(`${sx},${sy}`);
            }
            return `<polygon points="${starPoints.join(' ')}" ${svgProps}/>`;
            
        case 'Diamante':
            const diamondPts = `${cx},${y + size * 0.2} ${x + size * 0.8},${cy} ${cx},${y + size * 0.8} ${x + size * 0.2},${cy}`;
            return `<polygon points="${diamondPts}" ${svgProps}/>`;
            
        case 'Paralelogramo':
            const paraPoints = `${x + size * 0.2},${y} ${x + size},${y} ${x + size * 0.8},${y + size} ${x},${y + size}`;
            return `<polygon points="${paraPoints}" ${svgProps}/>`;
            
        case 'Cubo':
            return `<g ${svgProps}>
                <rect x="${x}" y="${y + size * 0.2}" width="${size * 0.8}" height="${size * 0.8}"/>
                <polygon points="${x + size * 0.2},${y} ${x + size},${y} ${x + size * 0.8},${y + size * 0.2} ${x},${y + size * 0.2}"/>
                <polygon points="${x + size * 0.8},${y + size * 0.2} ${x + size},${y} ${x + size},${y + size * 0.8} ${x + size * 0.8},${y + size}"/>
            </g>`;
            
        case 'Prisma':
            return `<g ${svgProps}>
                <polygon points="${x},${y + size} ${cx},${y} ${x + size},${y + size}"/>
                <polygon points="${cx},${y} ${x + size + halfSize},${y} ${x + size},${y + size}"/>
                <line x1="${cx}" y1="${y}" x2="${cx + halfSize}" y2="${y}"/>
            </g>`;
            
        case 'Triângulo Retângulo':
            const rightTriPoints = `${x},${y + size} ${x + size},${y + size} ${x},${y}`;
            return `<polygon points="${rightTriPoints}" ${svgProps}/>`;
            
        case 'Coração':
            const heartPath = `M ${cx} ${y + size * 0.3} 
                C ${cx} ${y + size * 0.1}, ${x + size * 0.2} ${y}, ${x + size * 0.4} ${y + size * 0.2}
                C ${x + size * 0.6} ${y}, ${x + size} ${y + size * 0.1}, ${x + size} ${y + size * 0.3}
                C ${x + size} ${y + size * 0.5}, ${cx} ${y + size * 0.8}, ${cx} ${y + size}
                C ${cx} ${y + size * 0.8}, ${x} ${y + size * 0.5}, ${x} ${y + size * 0.3} Z`;
            return `<path d="${heartPath}" ${svgProps}/>`;
            
        default:
            return `<rect x="${x}" y="${y}" width="${size}" height="${size}" ${svgProps}/>`;
    }
}

function exportComponentToSVG(componentId) {
    const component = AppState.components.find(c => c.id === componentId);
    if (!component) return;
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    component.shapes.forEach(item => {
        if (item.type === 'shape') {
            const x = item.x * SVG_CONFIG.scale;
            const y = item.y * SVG_CONFIG.scale;
            const size = 20 * SVG_CONFIG.scale;
            
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x + size);
            maxY = Math.max(maxY, y + size);
        }
    });
    
    const width = (maxX - minX) + (SVG_CONFIG.padding * 2);
    const height = (maxY - minY) + (SVG_CONFIG.padding * 2);
    
    const svgElements = component.shapes.map(item => {
        if (item.type === 'shape') {
            const x = (item.x * SVG_CONFIG.scale - minX) + SVG_CONFIG.padding;
            const y = (item.y * SVG_CONFIG.scale - minY) + SVG_CONFIG.padding;
            return shapeToSVG(item.data, x, y, SVG_CONFIG.scale);
        }
        return '';
    }).join('\n    ');
    
    const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" 
     width="${width}mm" height="${height}mm" 
     viewBox="0 0 ${width} ${height}">
                
    ${svgElements}
</svg>`;
    
    downloadSVG(svgContent, `${component.name.replace(/[^a-zA-Z0-9]/g, '_')}.svg`);
    
    alert(`SVG do componente "${component.name}" exportado com sucesso!`);
}

function exportGameToSVG(gameId) {
    const game = AppState.games.find(g => g.id === gameId);
    if (!game) return;
    
    const svgFiles = [];
    
    game.components.forEach((item, index) => {
        if (item.type === 'component') {
            const component = item.data;
            
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            
            component.shapes.forEach(shapeItem => {
                if (shapeItem.type === 'shape') {
                    const x = shapeItem.x * SVG_CONFIG.scale;
                    const y = shapeItem.y * SVG_CONFIG.scale;
                    const size = 20 * SVG_CONFIG.scale;
                    
                    minX = Math.min(minX, x);
                    minY = Math.min(minY, y);
                    maxX = Math.max(maxX, x + size);
                    maxY = Math.max(maxY, y + size);
                }
            });
            
            const width = (maxX - minX) + (SVG_CONFIG.padding * 2);
            const height = (maxY - minY) + (SVG_CONFIG.padding * 2);
            
            const svgElements = component.shapes.map(shapeItem => {
                if (shapeItem.type === 'shape') {
                    const x = (shapeItem.x * SVG_CONFIG.scale - minX) + SVG_CONFIG.padding;
                    const y = (shapeItem.y * SVG_CONFIG.scale - minY) + SVG_CONFIG.padding;
                    return shapeToSVG(shapeItem.data, x, y, SVG_CONFIG.scale);
                }
                return '';
            }).join('\n        ');
            
            const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" 
     width="${width}mm" height="${height}mm" 
     viewBox="0 0 ${width} ${height}">
                
    ${svgElements}
</svg>`;
            
            svgFiles.push({
                name: `${game.name.replace(/[^a-zA-Z0-9]/g, '_')}_${component.name.replace(/[^a-zA-Z0-9]/g, '_')}_${index + 1}.svg`,
                content: svgContent
            });
        }
    });
    
    if (svgFiles.length === 0) {
        alert('Nenhum componente para exportar neste jogo.');
        return;
    }
    
    if (svgFiles.length === 1) {
        downloadSVG(svgFiles[0].content, svgFiles[0].name);
    } else {
        createZipAndDownload(game.name, svgFiles);
    }
    
    alert(`SVGs do jogo "${game.name}" exportados com sucesso!`);
}

function downloadSVG(svgContent, filename) {
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function createZipAndDownload(gameName, files) {
    if (typeof JSZip === 'undefined') {
        alert('Biblioteca JSZip não carregada. Não é possível exportar múltiplos SVGs em um ZIP.');
        return;
    }

    const zip = new JSZip();
    files.forEach(file => {
        zip.file(file.name, file.content);
    });

    zip.generateAsync({ type: "blob" })
        .then(function (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${gameName.replace(/[^a-zA-Z0-9]/g, '_')}_SVGs.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        })
        .catch(error => {
            console.error('Erro ao gerar ZIP:', error);
            alert('Erro ao gerar arquivo ZIP.');
        });
}