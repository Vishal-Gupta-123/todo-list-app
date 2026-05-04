// script.js - Modern To-Do App with all features including Drag & Drop, LocalStorage, Dark Mode, Priority, Due Date

// ---------- DOM Elements ----------
const taskInput = document.getElementById('taskInput');
const dueDateInput = document.getElementById('dueDateInput');
const prioritySelect = document.getElementById('prioritySelect');
const addBtn = document.getElementById('addTaskBtn');
const taskList = document.getElementById('taskList');
const totalTasksSpan = document.getElementById('totalTasks');
const completedTasksSpan = document.getElementById('completedTasks');
const emptyMessageDiv = document.getElementById('emptyMessage');
const darkModeToggle = document.getElementById('darkModeToggle');

// Filter state
let currentFilter = 'all'; // 'all', 'completed', 'pending'

// ---------- Data Model ----------
let tasks = []; // each task: { id, text, completed, dueDate, priority, order }

// ---------- Helper functions ----------
function saveToLocalStorage() {
    localStorage.setItem('nexusTasks', JSON.stringify(tasks));
}

function loadFromLocalStorage() {
    const stored = localStorage.getItem('nexusTasks');
    if (stored) {
        tasks = JSON.parse(stored);
        // Ensure each task has priority and dueDate fields (backward compatibility)
        tasks = tasks.map(task => ({
            ...task,
            priority: task.priority || 'medium',
            dueDate: task.dueDate || ''
        }));
        // Sort by order if exists, else keep as is
        if (tasks.length && tasks[0].order === undefined) {
            tasks = tasks.map((task, idx) => ({ ...task, order: idx }));
        } else {
            tasks.sort((a, b) => (a.order || 0) - (b.order || 0));
        }
    } else {
        // Default demo tasks for better preview
        tasks = [
            { id: Date.now() + 1, text: 'Design dashboard UI', completed: false, dueDate: getTomorrowDate(), priority: 'high', order: 0 },
            { id: Date.now() + 2, text: 'Implement drag & drop', completed: true, dueDate: '', priority: 'medium', order: 1 },
            { id: Date.now() + 3, text: 'Write documentation', completed: false, dueDate: '', priority: 'low', order: 2 }
        ];
    }
    renderTasks();
}

function getTomorrowDate() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
}

// Update stats (total / completed)
function updateStats() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    totalTasksSpan.textContent = total;
    completedTasksSpan.textContent = completed;
}

// Show/hide empty message based on filtered list
function toggleEmptyMessage(visibleTasksCount) {
    if (visibleTasksCount === 0) {
        emptyMessageDiv.style.display = 'flex';
        emptyMessageDiv.style.flexDirection = 'column';
        emptyMessageDiv.style.alignItems = 'center';
    } else {
        emptyMessageDiv.style.display = 'none';
    }
}

// Render tasks based on current filter + order
function renderTasks() {
    // Determine visible tasks based on filter
    let filteredTasks = tasks.filter(task => {
        if (currentFilter === 'completed') return task.completed === true;
        if (currentFilter === 'pending') return task.completed === false;
        return true;
    });

    // Sort by order (preserve drag-drop order globally)
    filteredTasks.sort((a, b) => (a.order || 0) - (b.order || 0));

    // Clear existing list
    taskList.innerHTML = '';
    
    if (filteredTasks.length === 0) {
        toggleEmptyMessage(0);
        updateStats();
        return;
    }
    toggleEmptyMessage(filteredTasks.length);
    
    // Create each task element
    filteredTasks.forEach(task => {
        const li = document.createElement('li');
        li.setAttribute('data-id', task.id);
        if (task.completed) li.classList.add('completed');
        
        // Drag & drop attribute: sortablejs works with data-id and list children
        li.innerHTML = `
            <div class="task-content">
                <div class="task-title">${escapeHtml(task.text)}</div>
                <div class="task-meta">
                    ${task.dueDate ? `<span class="due-date"><i class="far fa-calendar-alt"></i> ${formatDate(task.dueDate)}</span>` : ''}
                    <span class="priority-badge priority-${task.priority}">${task.priority.toUpperCase()}</span>
                </div>
            </div>
            <div class="task-actions">
                <button class="btn-complete" title="Complete"><i class="fas fa-check-circle"></i></button>
                <button class="btn-edit" title="Edit"><i class="fas fa-pen"></i></button>
                <button class="btn-delete" title="Delete"><i class="fas fa-trash-alt"></i></button>
            </div>
        `;
        
        // Attach event listeners
        const completeBtn = li.querySelector('.btn-complete');
        const editBtn = li.querySelector('.btn-edit');
        const deleteBtn = li.querySelector('.btn-delete');
        
        completeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleComplete(task.id);
        });
        
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            editTask(task.id);
        });
        
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteTask(task.id);
        });
        
        taskList.appendChild(li);
    });
    
    updateStats();
    // Reinitialize drag-and-drop after render to keep it functional
    initDragAndDrop();
}

// Helper: escape HTML to avoid XSS
function escapeHtml(str) {
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    }).replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, function(c) {
        return c;
    });
}

function formatDate(dateString) {
    if (!dateString) return '';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

// ---------- Core task operations ----------
function addTask() {
    const text = taskInput.value.trim();
    if (text === '') {
        // subtle shake effect?
        taskInput.style.transform = 'shake 0.2s';
        setTimeout(() => { taskInput.style.transform = ''; }, 300);
        return;
    }
    const dueDate = dueDateInput.value;
    const priority = prioritySelect.value;
    const newId = Date.now();
    const maxOrder = tasks.length ? Math.max(...tasks.map(t => t.order || 0)) + 1 : 0;
    const newTask = {
        id: newId,
        text: text,
        completed: false,
        dueDate: dueDate,
        priority: priority,
        order: maxOrder
    };
    tasks.push(newTask);
    saveToLocalStorage();
    taskInput.value = '';
    dueDateInput.value = '';
    prioritySelect.value = 'medium';
    renderTasks();
}

function toggleComplete(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        saveToLocalStorage();
        renderTasks(); // re-render keeps filter state
    }
}

function editTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const newText = prompt('Edit your task:', task.text);
    if (newText !== null && newText.trim() !== '') {
        task.text = newText.trim();
        // Optional: allow editing due date and priority via simple prompt or inline dialog? 
        // For better UX: small prompt for due date & priority? Add simple extra prompts
        const newDue = prompt('Edit due date (YYYY-MM-DD) or leave empty:', task.dueDate);
        if (newDue !== null) task.dueDate = newDue;
        const newPriority = prompt('Set priority (low, medium, high):', task.priority);
        if (newPriority !== null && ['low', 'medium', 'high'].includes(newPriority.toLowerCase())) {
            task.priority = newPriority.toLowerCase();
        }
        saveToLocalStorage();
        renderTasks();
    }
}

function deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    // reorder indices after deletion to maintain smooth order
    tasks.forEach((task, index) => { task.order = index; });
    saveToLocalStorage();
    renderTasks();
}

// ---------- Drag and Drop Reordering (SortableJS) ----------
let sortableInstance = null;

function initDragAndDrop() {
    if (sortableInstance) sortableInstance.destroy();
    const container = document.getElementById('taskList');
    if (!container) return;
    sortableInstance = new Sortable(container, {
        animation: 250,
        handle: 'li',
        ghostClass: 'dragging',
        onEnd: function() {
            // after reorder, update tasks order based on current DOM order (filtered view only)
            // We must persist the ordering globally across the full tasks list, not just filtered.
            // Approach: get current visible sorted ids after drag and map to full tasks list.
            const listItems = document.querySelectorAll('#taskList li');
            const newOrderIds = Array.from(listItems).map(li => parseInt(li.getAttribute('data-id')));
            // Merge ordering: for tasks that are currently visible, we update their order based on new sequence.
            // For tasks hidden by filter, preserve previous relative order among themselves but interleave?
            // Simpler: rebuild global order: visible tasks get new order increment, then remaining tasks appended after.
            let visibleTasks = tasks.filter(task => {
                if (currentFilter === 'completed') return task.completed === true;
                if (currentFilter === 'pending') return task.completed === false;
                return true;
            });
            // sort visible tasks by the new order from drag-drop
            const orderedVisible = [];
            for (let id of newOrderIds) {
                const found = tasks.find(t => t.id === id);
                if (found) orderedVisible.push(found);
            }
            // hidden tasks are those not in orderedVisible
            const hiddenTasks = tasks.filter(t => !newOrderIds.includes(t.id));
            // combine: first visible reordered, then hidden
            const reorderedAll = [...orderedVisible, ...hiddenTasks];
            reorderedAll.forEach((task, idx) => { task.order = idx; });
            // sort tasks array globally
            tasks.sort((a, b) => (a.order || 0) - (b.order || 0));
            saveToLocalStorage();
            renderTasks(); // re-render maintain filter
        }
    });
}

// ---------- Filter Buttons ----------
function setActiveFilter(filter) {
    currentFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        if (btn.getAttribute('data-filter') === filter) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    renderTasks();
}

// ---------- Dark / Light Mode Toggle (Bonus) ----------
function initTheme() {
    const savedTheme = localStorage.getItem('nexusTheme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        updateThemeIcons(true);
    } else {
        document.body.classList.remove('dark-mode');
        updateThemeIcons(false);
    }
}

function updateThemeIcons(isDark) {
    const moonIcon = darkModeToggle.querySelector('.fa-moon');
    const sunIcon = darkModeToggle.querySelector('.fa-sun');
    if (isDark) {
        moonIcon.style.display = 'none';
        sunIcon.style.display = 'inline-block';
    } else {
        moonIcon.style.display = 'inline-block';
        sunIcon.style.display = 'none';
    }
}

function toggleDarkMode() {
    const isDarkNow = document.body.classList.toggle('dark-mode');
    localStorage.setItem('nexusTheme', isDarkNow ? 'dark' : 'light');
    updateThemeIcons(isDarkNow);
}

// ---------- Event Listeners & Initialization ----------
addBtn.addEventListener('click', addTask);
taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addTask();
});

// Filter buttons event
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const filterValue = e.currentTarget.getAttribute('data-filter');
        setActiveFilter(filterValue);
    });
});

darkModeToggle.addEventListener('click', toggleDarkMode);

// On page load
loadFromLocalStorage();
initTheme();
setActiveFilter('all');
// Set default due date placeholder empty, and initial render
// also ensure empty state check
window.addEventListener('load', () => {
    renderTasks();
    // set tomorrow date as placeholder example for due date picker (not required)
});