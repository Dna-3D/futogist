// Import Firebase functions
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    getDocs, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    doc, 
    orderBy, 
    query,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import {
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-storage.js";

// Firebase configuration using environment variables
const firebaseConfig = {
    apiKey: window.ENV_CONFIG.FIREBASE_API_KEY,
    authDomain: `${window.ENV_CONFIG.FIREBASE_PROJECT_ID}.firebaseapp.com`,
    projectId: window.ENV_CONFIG.FIREBASE_PROJECT_ID,
    storageBucket: `${window.ENV_CONFIG.FIREBASE_PROJECT_ID}.firebasestorage.app`,
    messagingSenderId: "189143575366",
    appId: window.ENV_CONFIG.FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// Admin credentials
const ADMIN_EMAIL = 'futogistmedia@gmail.com';
const ADMIN_PASSWORD = 'MikeMarcusSikoDNA';

// Global variables
let currentSection = 'dashboard';
let currentEditId = null;
let currentEditType = null;

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeAdmin();
});

// Initialize admin panel
function initializeAdmin() {
    setupLoginForm();
    setupNavigation();
    setupDashboard();
    setupHamburgerMenu();
    
    // Check if already logged in
    const isLoggedIn = sessionStorage.getItem('admin_logged_in');
    if (isLoggedIn) {
        showDashboard();
    } else {
        showLogin();
    }
}

// Setup login form
function setupLoginForm() {
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    
    loginForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
            sessionStorage.setItem('admin_logged_in', 'true');
            showDashboard();
            loginError.classList.remove('active');
        } else {
            loginError.textContent = 'Invalid email or password';
            loginError.classList.add('active');
        }
    });
    
    // Logout functionality
    const logoutBtn = document.getElementById('logout-btn');
    logoutBtn?.addEventListener('click', () => {
        sessionStorage.removeItem('admin_logged_in');
        showLogin();
    });
}

// Show login modal
function showLogin() {
    document.getElementById('login-modal').classList.add('active');
    document.getElementById('admin-dashboard').classList.remove('active');
}

// Show dashboard
function showDashboard() {
    document.getElementById('login-modal').classList.remove('active');
    document.getElementById('admin-dashboard').classList.add('active');
    loadDashboardStats();
    showSection('dashboard');
}

// Setup navigation
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.getAttribute('data-section');
            
            if (section) {
                showSection(section);
                
                // Update active nav item
                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
            }
        });
    });
}

// Show specific admin section
function showSection(sectionName) {
    currentSection = sectionName;
    
    const sections = document.querySelectorAll('.admin-section');
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) {
        targetSection.classList.add('active');
        
        // Load section-specific data
        switch(sectionName) {
            case 'dashboard':
                loadDashboardStats();
                break;
            case 'blog':
                loadBlogPosts();
                break;
            case 'carousel':
                loadCarouselAds();
                break;
            case 'ads':
                loadAds();
                break;
            case 'tickets':
                loadTickets();
                break;
            case 'polls':
                loadPolls();
                break;
        }
    }
}

// Setup dashboard
function setupDashboard() {
    const itemForm = document.getElementById('item-form');
    itemForm?.addEventListener('submit', handleFormSubmit);
    
    // Setup file upload preview
    setupFileUploadPreview();
}

// Setup file upload preview
function setupFileUploadPreview() {
    document.addEventListener('change', function(e) {
        if (e.target.type === 'file' && e.target.accept.includes('image')) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const previewContainer = document.createElement('div');
                    previewContainer.className = 'file-preview active';
                    previewContainer.innerHTML = `
                        <p><strong>Selected image:</strong></p>
                        <img src="${e.target.result}" alt="Preview">
                        <p style="margin-top: 0.5rem; font-size: 0.9rem; color: #666;">
                            File: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)
                        </p>
                    `;
                    
                    // Remove existing preview
                    const existingPreview = e.target.parentNode.querySelector('.file-preview');
                    if (existingPreview) {
                        existingPreview.remove();
                    }
                    
                    // Add new preview
                    e.target.parentNode.appendChild(previewContainer);
                };
                reader.readAsDataURL(file);
            }
        }
    });
}

// Load dashboard statistics
async function loadDashboardStats() {
    try {
        const collections = ['blog_posts', 'advertisements', 'tickets', 'polls'];
        const counts = {};
        
        for (const collectionName of collections) {
            const querySnapshot = await getDocs(collection(db, collectionName));
            counts[collectionName] = querySnapshot.size;
        }
        
        // Update stat cards
        document.getElementById('blog-count').textContent = counts.blog_posts || 0;
        document.getElementById('ads-count').textContent = counts.advertisements || 0;
        document.getElementById('tickets-count').textContent = counts.tickets || 0;
        document.getElementById('polls-count').textContent = counts.polls || 0;
        
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

// Load blog posts
async function loadBlogPosts() {
    const tbody = document.getElementById('blog-tbody');
    if (!tbody) return;
    
    showLoading();
    
    try {
        const postsQuery = query(collection(db, 'blog_posts'), orderBy('created_at', 'desc'));
        const querySnapshot = await getDocs(postsQuery);
        
        const posts = [];
        querySnapshot.forEach((doc) => {
            posts.push({ id: doc.id, ...doc.data() });
        });
        
        tbody.innerHTML = posts.map(post => `
            <tr>
                <td>${post.title}</td>
                <td>${post.author || 'Unknown'}</td>
                <td>${formatDate(post.created_at)}</td>
                <td>
                    <button class="btn btn-sm btn-secondary" onclick="editItem('blog', '${post.id}')">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteItem('blog_posts', '${post.id}')">Delete</button>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Error loading blog posts:', error);
        tbody.innerHTML = '<tr><td colspan="4">Error loading blog posts</td></tr>';
    }
    
    hideLoading();
}

// Load carousel ads
async function loadCarouselAds() {
    const tbody = document.getElementById('carousel-tbody');
    if (!tbody) return;
    
    showLoading();
    
    try {
        const adsQuery = query(collection(db, 'carousel_ads'), orderBy('created_at', 'desc'));
        const querySnapshot = await getDocs(adsQuery);
        
        const ads = [];
        querySnapshot.forEach((doc) => {
            ads.push({ id: doc.id, ...doc.data() });
        });
        
        tbody.innerHTML = ads.map(ad => `
            <tr>
                <td>${ad.title}</td>
                <td>Carousel ${ad.carousel}</td>
                <td>${ad.contact || 'N/A'}</td>
                <td>${formatDate(ad.created_at)}</td>
                <td>
                    <button class="btn btn-sm btn-secondary" onclick="editItem('carousel', '${ad.id}')">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteItem('carousel_ads', '${ad.id}')">Delete</button>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Error loading carousel ads:', error);
        tbody.innerHTML = '<tr><td colspan="5">Error loading carousel ads</td></tr>';
    }
    
    hideLoading();
}

// Load advertisements
async function loadAds() {
    const tbody = document.getElementById('ads-tbody');
    if (!tbody) return;
    
    showLoading();
    
    try {
        const adsQuery = query(collection(db, 'advertisements'), orderBy('created_at', 'desc'));
        const querySnapshot = await getDocs(adsQuery);
        
        const ads = [];
        querySnapshot.forEach((doc) => {
            ads.push({ id: doc.id, ...doc.data() });
        });
        
        tbody.innerHTML = ads.map(ad => `
            <tr>
                <td>${ad.title}</td>
                <td>${ad.contact || 'N/A'}</td>
                <td>${ad.location || 'N/A'}</td>
                <td>${formatDate(ad.created_at)}</td>
                <td>
                    <button class="btn btn-sm btn-secondary" onclick="editItem('ads', '${ad.id}')">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteItem('advertisements', '${ad.id}')">Delete</button>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Error loading advertisements:', error);
        tbody.innerHTML = '<tr><td colspan="5">Error loading advertisements</td></tr>';
    }
    
    hideLoading();
}

// Load tickets
async function loadTickets() {
    const tbody = document.getElementById('tickets-tbody');
    if (!tbody) return;
    
    showLoading();
    
    try {
        const ticketsQuery = query(collection(db, 'tickets'), orderBy('created_at', 'desc'));
        const querySnapshot = await getDocs(ticketsQuery);
        
        const tickets = [];
        querySnapshot.forEach((doc) => {
            tickets.push({ id: doc.id, ...doc.data() });
        });
        
        tbody.innerHTML = tickets.map(ticket => `
            <tr>
                <td>${ticket.title}</td>
                <td>${formatDate(ticket.date)}</td>
                <td>₦${ticket.price || 'Free'}</td>
                <td>${ticket.location || 'N/A'}</td>
                <td>
                    <button class="btn btn-sm btn-secondary" onclick="editItem('tickets', '${ticket.id}')">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteItem('tickets', '${ticket.id}')">Delete</button>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Error loading tickets:', error);
        tbody.innerHTML = '<tr><td colspan="5">Error loading tickets</td></tr>';
    }
    
    hideLoading();
}

// Load polls
async function loadPolls() {
    const tbody = document.getElementById('polls-tbody');
    if (!tbody) {
        console.error('Polls table body not found');
        return;
    }
    
    showLoading();
    
    try {
        console.log('Loading polls from Firebase...');
        
        // Check if the polls collection exists and has documents
        const pollsQuery = query(collection(db, 'polls'), orderBy('created_at', 'desc'));
        const querySnapshot = await getDocs(pollsQuery);
        
        console.log(`Found ${querySnapshot.size} polls`);
        
        const polls = [];
        querySnapshot.forEach((doc) => {
            const pollData = doc.data();
            console.log('Poll data:', pollData);
            polls.push({ id: doc.id, ...pollData });
        });
        
        if (polls.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #666; padding: 2rem;">No polls found. Create your first poll!</td></tr>';
        } else {
        tbody.innerHTML = polls.map(poll => {
            const totalVotes = poll.options ? poll.options.reduce((sum, option) => sum + (option.votes || 0), 0) : 0;
                const status = poll.show_results ? 'Closed' : 'Active';
                const statusClass = poll.show_results ? 'text-danger' : 'text-success';
                
            return `
                <tr>
                        <td>${poll.question || 'No question'}</td>
                    <td>${totalVotes}</td>
                        <td><span class="${statusClass}">${status}</span></td>
                    <td>${formatDate(poll.created_at)}</td>
                    <td>
                        <button class="btn btn-sm btn-secondary" onclick="editItem('polls', '${poll.id}')">Edit</button>
                        <button class="btn btn-sm btn-success" onclick="togglePollResults('${poll.id}', ${!poll.show_results})">
                            ${poll.show_results ? 'Reopen' : 'Close'}
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteItem('polls', '${poll.id}')">Delete</button>
                    </td>
                </tr>
            `;
        }).join('');
        }
        
    } catch (error) {
        console.error('Error loading polls:', error);
        
        // Provide more specific error messages
        let errorMessage = 'Error loading polls';
        
        if (error.code === 'permission-denied') {
            errorMessage = 'Permission denied. Please check your Firebase security rules.';
        } else if (error.code === 'unavailable') {
            errorMessage = 'Firebase service is currently unavailable. Please try again later.';
        } else if (error.code === 'not-found') {
            errorMessage = 'Polls collection not found. This is normal for new installations.';
        } else if (error.message) {
            errorMessage = `Error: ${error.message}`;
        }
        
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; color: #dc3545; padding: 2rem;">
                    <div style="margin-bottom: 1rem;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 0.5rem;"></i>
                    </div>
                    <div>${errorMessage}</div>
                    <div style="margin-top: 1rem; font-size: 0.9rem; color: #666;">
                        <button class="btn btn-primary" onclick="loadPolls()">Retry</button>
                    </div>
                </td>
            </tr>
        `;
    }
    
    hideLoading();
}

// Show add form modal
function showAddForm(type) {
    currentEditId = null;
    currentEditType = type;
    
    const modal = document.getElementById('form-modal');
    const modalTitle = document.getElementById('modal-title');
    const formFields = document.getElementById('form-fields');
    
    modalTitle.textContent = `Add New ${getTypeLabel(type)}`;
    formFields.innerHTML = generateFormFields(type);
    
    modal.classList.add('active');
}

// Edit item
async function editItem(type, id) {
    currentEditId = id;
    currentEditType = type;
    
    showLoading();
    
    try {
        const collectionName = getCollectionName(type);
        const docRef = doc(db, collectionName, id);
        const docSnap = await getDocs(query(collection(db, collectionName)));
        
        let itemData = null;
        docSnap.forEach((doc) => {
            if (doc.id === id) {
                itemData = { id: doc.id, ...doc.data() };
            }
        });
        
        if (itemData) {
            const modal = document.getElementById('form-modal');
            const modalTitle = document.getElementById('modal-title');
            const formFields = document.getElementById('form-fields');
            
            modalTitle.textContent = `Edit ${getTypeLabel(type)}`;
            formFields.innerHTML = generateFormFields(type, itemData);
            
            modal.classList.add('active');
        }
        
    } catch (error) {
        console.error('Error loading item for edit:', error);
        alert('Error loading item for editing');
    }
    
    hideLoading();
}

// Generate form fields based on type
function generateFormFields(type, data = {}) {
    const commonFields = `
        <div class="form-group">
            <label for="title">Title *</label>
            <input type="text" id="title" name="title" value="${data.title || ''}" required>
        </div>
        <div class="form-group">
            <label for="description">Description</label>
            <textarea id="description" name="description">${data.description || ''}</textarea>
        </div>
        <div class="form-group">
            <label for="image_file">Image</label>
            <input type="file" id="image_file" name="image_file" accept="image/*" class="file-input">
            ${data.image_url ? `
                <div class="current-image">
                    <p>Current image:</p>
                    <img src="${data.image_url}" alt="Current image" style="max-width: 200px; max-height: 150px; border-radius: 8px; margin-top: 0.5rem;">
                    <input type="hidden" name="current_image_url" value="${data.image_url}">
                </div>
            ` : ''}
        </div>
    `;
    
    switch(type) {
        case 'blog':
            return `
                ${commonFields}
                <div class="form-group">
                    <label for="content">Content *</label>
                    <textarea id="content" name="content" required>${data.content || ''}</textarea>
                </div>
                <div class="form-group">
                    <label for="author">Author</label>
                    <input type="text" id="author" name="author" value="${data.author || 'FUTO Gist Team'}">
                </div>
            `;
            
        case 'carousel':
            return `
                ${commonFields}
                <div class="form-group">
                    <label for="carousel">Carousel Number *</label>
                    <select id="carousel" name="carousel" required>
                        <option value="1" ${data.carousel === 1 ? 'selected' : ''}>Carousel 1</option>
                        <option value="2" ${data.carousel === 2 ? 'selected' : ''}>Carousel 2</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="contact">Contact Information</label>
                    <input type="text" id="contact" name="contact" value="${data.contact || ''}">
                </div>
                <div class="form-group">
                    <label for="website">Website URL</label>
                    <input type="url" id="website" name="website" value="${data.website || ''}">
                </div>
            `;
            
        case 'ads':
            return `
                ${commonFields}
                <div class="form-group">
                    <label for="contact">Contact Information</label>
                    <input type="text" id="contact" name="contact" value="${data.contact || ''}">
                </div>
                <div class="form-group">
                    <label for="location">Location</label>
                    <input type="text" id="location" name="location" value="${data.location || ''}">
                </div>
                <div class="form-group">
                    <label for="website">Website URL</label>
                    <input type="url" id="website" name="website" value="${data.website || ''}">
                </div>
            `;
            
        case 'tickets':
            return `
                ${commonFields}
                <div class="form-group">
                    <label for="date">Event Date</label>
                    <input type="datetime-local" id="date" name="date" value="${formatDateForInput(data.date)}">
                </div>
                <div class="form-group">
                    <label for="location">Location</label>
                    <input type="text" id="location" name="location" value="${data.location || ''}">
                </div>
                <div class="form-group">
                    <label for="price">Price (₦)</label>
                    <input type="number" id="price" name="price" min="0" value="${data.price || ''}">
                </div>
            `;
            
        case 'polls':
            const existingOptions = data.options || [
                { text: '', votes: 0 },
                { text: '', votes: 0 }
            ];
            
            const optionsHtml = existingOptions.map((option, index) => `
                <div class="form-group poll-option" data-index="${index}">
                    <div style="display: flex; gap: 0.5rem; align-items: center;">
                        <input type="text" id="option${index}" name="option${index}" 
                               value="${option.text || ''}" required 
                               placeholder="Option ${index + 1}" style="flex: 1;">
                        ${index >= 2 ? `<button type="button" class="btn btn-sm btn-danger" onclick="removePollOption(${index})" style="min-width: 40px;">×</button>` : ''}
                </div>
                </div>
            `).join('');
            
            return `
                <div class="form-group">
                    <label for="question">Question *</label>
                    <input type="text" id="question" name="question" value="${data.question || ''}" required>
                </div>
                <div class="form-group">
                    <label for="description">Description</label>
                    <textarea id="description" name="description">${data.description || ''}</textarea>
                </div>
                <div class="form-group">
                    <label>Poll Options * (Minimum 2)</label>
                    <div id="poll-options">
                ${optionsHtml}
                    </div>
                    <button type="button" class="btn btn-outline" onclick="addPollOption()" style="margin-top: 0.5rem;">
                        <i class="fas fa-plus"></i> Add Option
                    </button>
                </div>
                <div class="form-group">
                    <label for="show_results">Show Results</label>
                    <select id="show_results" name="show_results">
                        <option value="false" ${!data.show_results ? 'selected' : ''}>Keep Poll Open</option>
                        <option value="true" ${data.show_results ? 'selected' : ''}>Show Results (Close Poll)</option>
                    </select>
                </div>
            `;
            
        default:
            return commonFields;
    }
}

// Add poll option
function addPollOption() {
    const pollOptions = document.getElementById('poll-options');
    const optionCount = pollOptions.children.length;
    
    const newOption = document.createElement('div');
    newOption.className = 'form-group poll-option';
    newOption.setAttribute('data-index', optionCount);
    newOption.innerHTML = `
        <div style="display: flex; gap: 0.5rem; align-items: center;">
            <input type="text" id="option${optionCount}" name="option${optionCount}" 
                   required placeholder="Option ${optionCount + 1}" style="flex: 1;">
            <button type="button" class="btn btn-sm btn-danger" onclick="removePollOption(${optionCount})" style="min-width: 40px;">×</button>
        </div>
    `;
    
    pollOptions.appendChild(newOption);
}

// Remove poll option
function removePollOption(index) {
    const pollOptions = document.getElementById('poll-options');
    const optionToRemove = pollOptions.querySelector(`[data-index="${index}"]`);
    
    if (pollOptions.children.length > 2) {
        optionToRemove.remove();
        // Reindex remaining options
        const remainingOptions = pollOptions.querySelectorAll('.poll-option');
        remainingOptions.forEach((option, newIndex) => {
            option.setAttribute('data-index', newIndex);
            const input = option.querySelector('input');
            input.id = `option${newIndex}`;
            input.name = `option${newIndex}`;
            input.placeholder = `Option ${newIndex + 1}`;
            const removeBtn = option.querySelector('button');
            if (removeBtn) {
                removeBtn.onclick = () => removePollOption(newIndex);
            }
        });
    }
}

// Handle form submission
async function handleFormSubmit(e) {
    e.preventDefault();
    
    showLoading();
    
    const formData = new FormData(e.target);
    const data = {};
    
    // Handle file upload first
    const imageFile = formData.get('image_file');
    if (imageFile && imageFile.size > 0) {
        try {
            console.log('Uploading image file...');
            const timestamp = Date.now();
            const fileName = `${currentEditType}_${timestamp}_${imageFile.name}`;
            const storageRef = ref(storage, `images/${currentEditType}/${fileName}`);
            
            const snapshot = await uploadBytes(storageRef, imageFile);
            const downloadURL = await getDownloadURL(snapshot.ref);
            
            data.image_url = downloadURL;
            console.log('Image uploaded successfully:', downloadURL);
        } catch (uploadError) {
            console.error('Error uploading image:', uploadError);
            alert('Error uploading image. Please try again.');
            hideLoading();
            return;
        }
    } else {
        // Keep existing image URL if no new file is uploaded
        const currentImageUrl = formData.get('current_image_url');
        if (currentImageUrl) {
            data.image_url = currentImageUrl;
        }
    }
    
    // Convert form data to object
    for (let [key, value] of formData.entries()) {
        if (key.startsWith('option')) {
            if (!data.options) data.options = [];
            const index = parseInt(key.replace('option', ''));
            data.options[index] = { text: value, votes: 0 };
        } else if (key === 'carousel') {
            data[key] = parseInt(value);
        } else if (key === 'price') {
            data[key] = value ? parseFloat(value) : null;
        } else if (key === 'show_results') {
            data[key] = value === 'true';
        } else if (key === 'date' && value) {
            data[key] = new Date(value);
        } else if (key !== 'image_file' && key !== 'current_image_url') {
            // Skip file input and current image URL as they're handled above
            data[key] = value || null;
        }
    }
    
    // Special validation for polls
    if (currentEditType === 'polls') {
        // Filter out empty options
        if (data.options) {
            data.options = data.options.filter(option => option.text && option.text.trim() !== '');
        }
        
        // Ensure minimum 2 options
        if (!data.options || data.options.length < 2) {
            alert('Polls must have at least 2 options.');
            hideLoading();
            return;
        }
        
        // Ensure question is provided
        if (!data.question || data.question.trim() === '') {
            alert('Poll question is required.');
            hideLoading();
            return;
        }
        
        console.log('Poll data to save:', data);
    }
    
    // Add timestamp
    if (!currentEditId) {
        data.created_at = serverTimestamp();
    }
    data.updated_at = serverTimestamp();
    
    try {
        const collectionName = getCollectionName(currentEditType);
        console.log('Saving to collection:', collectionName);
        
        if (currentEditId) {
            // Update existing item
            const docRef = doc(db, collectionName, currentEditId);
            await updateDoc(docRef, data);
            alert('Item updated successfully!');
        } else {
            // Add new item
            const docRef = await addDoc(collection(db, collectionName), data);
            console.log('Document written with ID: ', docRef.id);
            alert('Item added successfully!');
        }
        
        closeModal();
        showSection(currentSection); // Reload current section
        
    } catch (error) {
        console.error('Error saving item:', error);
        
        // Provide more specific error messages
        let errorMessage = 'Error saving item. Please try again.';
        
        if (error.code === 'permission-denied') {
            errorMessage = 'Permission denied. Please check your Firebase security rules.';
        } else if (error.code === 'unavailable') {
            errorMessage = 'Firebase service is currently unavailable. Please try again later.';
        } else if (error.message) {
            errorMessage = `Error: ${error.message}`;
        }
        
        alert(errorMessage);
    }
    
    hideLoading();
}

// Delete item
async function deleteItem(collectionName, id) {
    if (!confirm('Are you sure you want to delete this item?')) {
        return;
    }
    
    showLoading();
    
    try {
        await deleteDoc(doc(db, collectionName, id));
        alert('Item deleted successfully!');
        showSection(currentSection); // Reload current section
        
    } catch (error) {
        console.error('Error deleting item:', error);
        alert('Error deleting item. Please try again.');
    }
    
    hideLoading();
}

// Toggle poll results
async function togglePollResults(pollId, showResults) {
    showLoading();
    
    try {
        const pollRef = doc(db, 'polls', pollId);
        await updateDoc(pollRef, {
            show_results: showResults,
            updated_at: serverTimestamp()
        });
        
        alert(`Poll ${showResults ? 'closed' : 'reopened'} successfully!`);
        loadPolls();
        
    } catch (error) {
        console.error('Error toggling poll results:', error);
        alert('Error updating poll. Please try again.');
    }
    
    hideLoading();
}

// Close modal
function closeModal() {
    document.getElementById('form-modal').classList.remove('active');
    currentEditId = null;
    currentEditType = null;
}

// Utility functions
function getTypeLabel(type) {
    const labels = {
        'blog': 'Blog Post',
        'carousel': 'Carousel Ad',
        'ads': 'Advertisement',
        'tickets': 'Event Ticket',
        'polls': 'Poll'
    };
    return labels[type] || type;
}

function getCollectionName(type) {
    const collections = {
        'blog': 'blog_posts',
        'carousel': 'carousel_ads',
        'ads': 'advertisements',
        'tickets': 'tickets',
        'polls': 'polls'
    };
    return collections[type] || type;
}

function formatDate(timestamp) {
    if (!timestamp) return 'Unknown date';
    
    let date;
    if (timestamp.toDate) {
        // Firestore timestamp
        date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
        date = timestamp;
    } else {
        date = new Date(timestamp);
    }
    
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatDateForInput(timestamp) {
    if (!timestamp) return '';
    
    let date;
    if (timestamp.toDate) {
        date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
        date = timestamp;
    } else {
        date = new Date(timestamp);
    }
    
    return date.toISOString().slice(0, 16);
}

function showLoading() {
    document.getElementById('loading').classList.add('active');
}

function hideLoading() {
    document.getElementById('loading').classList.remove('active');
}

// Setup hamburger menu
function setupHamburgerMenu() {
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');

    hamburgerBtn?.addEventListener('click', () => {
        sidebar.classList.toggle('active');
    });

    // Close sidebar when clicking outside on mobile
    mainContent?.addEventListener('click', () => {
        if (window.innerWidth <= 768 && sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
        }
    });

    // Close sidebar when clicking on overlay
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && 
            sidebar.classList.contains('active') && 
            !sidebar.contains(e.target) && 
            !hamburgerBtn.contains(e.target)) {
            sidebar.classList.remove('active');
        }
    });

    // Close sidebar on window resize if screen becomes larger
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            sidebar.classList.remove('active');
        }
    });
}

// Make functions globally available
window.showAddForm = showAddForm;
window.editItem = editItem;
window.deleteItem = deleteItem;
window.togglePollResults = togglePollResults;
window.closeModal = closeModal;
window.addPollOption = addPollOption;
window.removePollOption = removePollOption;
