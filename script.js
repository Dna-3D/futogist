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
    limit,
    increment 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

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

// Global variables
let currentCarousel1Index = 0;
let currentCarousel2Index = 0;
let carousel1Items = [];
let carousel2Items = [];

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeBlogApp();
    setupNavigation();
    setupCarousels();
    loadInitialData();
});

// Initialize application
function initializeBlogApp() {
    console.log('FUTO Gist Blog initialized');
    showSection('home');
}

// Setup navigation
function setupNavigation() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    const navLinks = document.querySelectorAll('.nav-link:not(.admin-link)');

    // Mobile menu toggle
    hamburger?.addEventListener('click', () => {
        navMenu.classList.toggle('active');
    });

    // Navigation links
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.getAttribute('data-section');
            showSection(section);
            
            // Update active nav link
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            // Close mobile menu
            navMenu.classList.remove('active');
        });
    });
}

// Show specific section
function showSection(sectionName) {
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    const targetSection = document.getElementById(sectionName);
    if (targetSection) {
        targetSection.classList.add('active');
        
        // Load section-specific data
        switch(sectionName) {
            case 'home':
                loadHomeData();
                break;
            case 'blog':
                loadBlogPosts();
                break;
            case 'ads':
                loadAds();
                break;
            case 'tickets':
                loadTickets();
                break;
            case 'vote':
                loadVotes();
                break;
        }
    }
}

// Setup carousels
function setupCarousels() {
    // Carousel 1 controls
    const carousel1Prev = document.getElementById('carousel1-prev');
    const carousel1Next = document.getElementById('carousel1-next');
    
    carousel1Prev?.addEventListener('click', () => prevCarouselItem(1));
    carousel1Next?.addEventListener('click', () => nextCarouselItem(1));
    
    // Carousel 2 controls
    const carousel2Prev = document.getElementById('carousel2-prev');
    const carousel2Next = document.getElementById('carousel2-next');
    
    carousel2Prev?.addEventListener('click', () => prevCarouselItem(2));
    carousel2Next?.addEventListener('click', () => nextCarouselItem(2));
    
    // Auto-play carousels
    setInterval(() => {
        nextCarouselItem(1);
        nextCarouselItem(2);
    }, 5000);
}

// Carousel navigation
function prevCarouselItem(carouselNum) {
    if (carouselNum === 1) {
        currentCarousel1Index = currentCarousel1Index > 0 ? currentCarousel1Index - 1 : carousel1Items.length - 1;
        updateCarousel(1);
    } else {
        currentCarousel2Index = currentCarousel2Index > 0 ? currentCarousel2Index - 1 : carousel2Items.length - 1;
        updateCarousel(2);
    }
}

function nextCarouselItem(carouselNum) {
    if (carouselNum === 1) {
        currentCarousel1Index = currentCarousel1Index < carousel1Items.length - 1 ? currentCarousel1Index + 1 : 0;
        updateCarousel(1);
    } else {
        currentCarousel2Index = currentCarousel2Index < carousel2Items.length - 1 ? currentCarousel2Index + 1 : 0;
        updateCarousel(2);
    }
}

function updateCarousel(carouselNum) {
    const track = document.getElementById(`carousel${carouselNum}-track`);
    const index = carouselNum === 1 ? currentCarousel1Index : currentCarousel2Index;
    
    if (track) {
        track.style.transform = `translateX(-${index * 100}%)`;
    }
}

// Load initial data
async function loadInitialData() {
    try {
        await loadCarouselAds();
        await loadHomeData();
    } catch (error) {
        console.error('Error loading initial data:', error);
    }
}

// Load home page data
async function loadHomeData() {
    await loadLatestPosts();
}

// Load carousel advertisements
async function loadCarouselAds() {
    try {
        const adsQuery = query(collection(db, 'carousel_ads'), orderBy('created_at', 'desc'));
        const querySnapshot = await getDocs(adsQuery);
        
        carousel1Items = [];
        carousel2Items = [];
        
        querySnapshot.forEach((doc) => {
            const ad = { id: doc.id, ...doc.data() };
            if (ad.carousel === 1) {
                carousel1Items.push(ad);
            } else if (ad.carousel === 2) {
                carousel2Items.push(ad);
            }
        });
        
        renderCarousel(1);
        renderCarousel(2);
        
    } catch (error) {
        console.error('Error loading carousel ads:', error);
        // Show default carousel items if no ads available
        renderDefaultCarousel();
    }
}

// Render carousel
function renderCarousel(carouselNum) {
    const track = document.getElementById(`carousel${carouselNum}-track`);
    const items = carouselNum === 1 ? carousel1Items : carousel2Items;
    
    if (!track) return;
    
    if (items.length === 0) {
        track.innerHTML = `
            <div class="carousel-item">
                <div class="carousel-item-content">
                    <h3>No Advertisements Available</h3>
                    <p>Check back later for business advertisements</p>
                </div>
            </div>
        `;
        return;
    }
    
    track.innerHTML = items.map(item => `
        <div class="carousel-item">
            ${item.image_url ? `<img src="${item.image_url}" alt="${item.title}" onerror="this.style.display='none'">` : ''}
            <div class="carousel-item-content">
                <h3>${item.title}</h3>
                <p>${item.description}</p>
                ${item.contact ? `<p><strong>Contact:</strong> ${item.contact}</p>` : ''}
                ${item.website ? `<a href="${item.website}" target="_blank" class="btn">Visit Website</a>` : ''}
            </div>
        </div>
    `).join('');
}

// Render default carousel when no ads available
function renderDefaultCarousel() {
    const track1 = document.getElementById('carousel1-track');
    const track2 = document.getElementById('carousel2-track');
    
    if (track1) {
        track1.innerHTML = `
            <div class="carousel-item">
                <div class="carousel-item-content">
                    <h3>Welcome to FUTO Gist</h3>
                    <p>Your premier platform for campus news and business advertisements</p>
                </div>
            </div>
        `;
    }
    
    if (track2) {
        track2.innerHTML = `
            <div class="carousel-item">
                <div class="carousel-item-content">
                    <h3>Advertise Your Business</h3>
                    <p>Reach thousands of students and staff at FUTO</p>
                </div>
            </div>
        `;
    }
}

// Load latest posts for home page
async function loadLatestPosts() {
    try {
        const postsQuery = query(collection(db, 'blog_posts'), orderBy('created_at', 'desc'), limit(3));
        const querySnapshot = await getDocs(postsQuery);
        
        const latestPostsGrid = document.getElementById('latest-posts-grid');
        if (!latestPostsGrid) return;
        
        if (querySnapshot.empty) {
            latestPostsGrid.innerHTML = `
                <div class="card">
                    <h3>No Posts Available</h3>
                    <p>Check back later for the latest campus news and updates</p>
                </div>
            `;
            return;
        }
        
        const posts = [];
        querySnapshot.forEach((doc) => {
            posts.push({ id: doc.id, ...doc.data() });
        });
        
        latestPostsGrid.innerHTML = posts.map(post => `
            <div class="card">
                ${post.image_url ? `<img src="${post.image_url}" alt="${post.title}" onerror="this.style.display='none'">` : ''}
                <div class="date">${formatDate(post.created_at)}</div>
                <h3>${post.title}</h3>
                <p>${post.content.substring(0, 150)}${post.content.length > 150 ? '...' : ''}</p>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading latest posts:', error);
        const latestPostsGrid = document.getElementById('latest-posts-grid');
        if (latestPostsGrid) {
            latestPostsGrid.innerHTML = `
                <div class="card">
                    <h3>Error Loading Posts</h3>
                    <p>Please check your internet connection and try again</p>
                </div>
            `;
        }
    }
}

// Load blog posts
async function loadBlogPosts() {
    const blogGrid = document.getElementById('blog-grid');
    const blogLoading = document.getElementById('blog-loading');
    
    if (!blogGrid || !blogLoading) return;
    
    blogLoading.style.display = 'block';
    blogGrid.innerHTML = '';
    
    try {
        const postsQuery = query(collection(db, 'blog_posts'), orderBy('created_at', 'desc'));
        const querySnapshot = await getDocs(postsQuery);
        
        blogLoading.style.display = 'none';
        
        if (querySnapshot.empty) {
            blogGrid.innerHTML = `
                <div class="card">
                    <h3>No Blog Posts Available</h3>
                    <p>Check back later for the latest campus news and updates</p>
                </div>
            `;
            return;
        }
        
        const posts = [];
        querySnapshot.forEach((doc) => {
            posts.push({ id: doc.id, ...doc.data() });
        });
        
        blogGrid.innerHTML = posts.map(post => `
            <div class="card">
                ${post.image_url ? `<img src="${post.image_url}" alt="${post.title}" onerror="this.style.display='none'">` : ''}
                <div class="date">${formatDate(post.created_at)}</div>
                <h3>${post.title}</h3>
                <p>${post.content}</p>
                ${post.author ? `<p><strong>By:</strong> ${post.author}</p>` : ''}
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading blog posts:', error);
        blogLoading.style.display = 'none';
        blogGrid.innerHTML = `
            <div class="card">
                <h3>Error Loading Posts</h3>
                <p>Please check your internet connection and try again</p>
            </div>
        `;
    }
}

// Load advertisements
async function loadAds() {
    const adsGrid = document.getElementById('ads-grid');
    const adsLoading = document.getElementById('ads-loading');
    
    if (!adsGrid || !adsLoading) return;
    
    adsLoading.style.display = 'block';
    adsGrid.innerHTML = '';
    
    try {
        const adsQuery = query(collection(db, 'advertisements'), orderBy('created_at', 'desc'));
        const querySnapshot = await getDocs(adsQuery);
        
        adsLoading.style.display = 'none';
        
        if (querySnapshot.empty) {
            adsGrid.innerHTML = `
                <div class="card">
                    <h3>No Advertisements Available</h3>
                    <p>Check back later for business advertisements</p>
                </div>
            `;
            return;
        }
        
        const ads = [];
        querySnapshot.forEach((doc) => {
            ads.push({ id: doc.id, ...doc.data() });
        });
        
        adsGrid.innerHTML = ads.map(ad => `
            <div class="card">
                ${ad.image_url ? `<img src="${ad.image_url}" alt="${ad.title}" onerror="this.style.display='none'">` : ''}
                <h3>${ad.title}</h3>
                <p>${ad.description}</p>
                ${ad.contact ? `<p><strong>Contact:</strong> ${ad.contact}</p>` : ''}
                ${ad.location ? `<p><strong>Location:</strong> ${ad.location}</p>` : ''}
                ${ad.website ? `<a href="${ad.website}" target="_blank" class="btn">Visit Website</a>` : ''}
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading advertisements:', error);
        adsLoading.style.display = 'none';
        adsGrid.innerHTML = `
            <div class="card">
                <h3>Error Loading Advertisements</h3>
                <p>Please check your internet connection and try again</p>
            </div>
        `;
    }
}

// Load tickets
async function loadTickets() {
    const ticketsGrid = document.getElementById('tickets-grid');
    const ticketsLoading = document.getElementById('tickets-loading');
    
    if (!ticketsGrid || !ticketsLoading) return;
    
    ticketsLoading.style.display = 'block';
    ticketsGrid.innerHTML = '';
    
    try {
        const ticketsQuery = query(collection(db, 'tickets'), orderBy('created_at', 'desc'));
        const querySnapshot = await getDocs(ticketsQuery);
        
        ticketsLoading.style.display = 'none';
        
        if (querySnapshot.empty) {
            ticketsGrid.innerHTML = `
                <div class="card">
                    <h3>No Events Available</h3>
                    <p>Check back later for upcoming events and tickets</p>
                </div>
            `;
            return;
        }
        
        const tickets = [];
        querySnapshot.forEach((doc) => {
            tickets.push({ id: doc.id, ...doc.data() });
        });
        
        ticketsGrid.innerHTML = tickets.map(ticket => `
            <div class="card">
                ${ticket.image_url ? `<img src="${ticket.image_url}" alt="${ticket.title}" onerror="this.style.display='none'">` : ''}
                <h3>${ticket.title}</h3>
                <p>${ticket.description}</p>
                ${ticket.date ? `<p><strong>Date:</strong> ${formatDate(ticket.date)}</p>` : ''}
                ${ticket.location ? `<p><strong>Location:</strong> ${ticket.location}</p>` : ''}
                ${ticket.price ? `<div class="price">₦${ticket.price}</div>` : ''}
                <a href="https://wa.me/2348081610560?text=Hi, I'm interested in ${encodeURIComponent(ticket.title)} ticket" 
                   target="_blank" class="btn btn-whatsapp">
                    <i class="fab fa-whatsapp"></i> Get Ticket via WhatsApp
                </a>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading tickets:', error);
        ticketsLoading.style.display = 'none';
        ticketsGrid.innerHTML = `
            <div class="card">
                <h3>Error Loading Tickets</h3>
                <p>Please check your internet connection and try again</p>
            </div>
        `;
    }
}

// Load votes/polls
async function loadVotes() {
    const votesContainer = document.getElementById('votes-container');
    const voteLoading = document.getElementById('vote-loading');
    
    if (!votesContainer || !voteLoading) return;
    
    voteLoading.style.display = 'block';
    votesContainer.innerHTML = '';
    
    try {
        const votesQuery = query(collection(db, 'polls'), orderBy('created_at', 'desc'));
        const querySnapshot = await getDocs(votesQuery);
        
        voteLoading.style.display = 'none';
        
        if (querySnapshot.empty) {
            votesContainer.innerHTML = `
                <div class="vote-item">
                    <h3>No Active Polls</h3>
                    <p>Check back later for polls and surveys</p>
                </div>
            `;
            return;
        }
        
        const polls = [];
        querySnapshot.forEach((doc) => {
            polls.push({ id: doc.id, ...doc.data() });
        });
        
        votesContainer.innerHTML = polls.map(poll => renderPoll(poll)).join('');
        
        // Add event listeners for voting
        document.querySelectorAll('.vote-form').forEach(form => {
            form.addEventListener('submit', handleVote);
        });
        
    } catch (error) {
        console.error('Error loading polls:', error);
        voteLoading.style.display = 'none';
        votesContainer.innerHTML = `
            <div class="vote-item">
                <h3>Error Loading Polls</h3>
                <p>Please check your internet connection and try again</p>
            </div>
        `;
    }
}

// Render poll
function renderPoll(poll) {
    const totalVotes = poll.options ? poll.options.reduce((sum, option) => sum + (option.votes || 0), 0) : 0;
    
    return `
        <div class="vote-item">
            <h3>${poll.question}</h3>
            <p>${poll.description || ''}</p>
            
            ${poll.show_results ? `
                <div class="vote-results">
                    <h4>Results (${totalVotes} votes)</h4>
                    ${poll.options ? poll.options.map(option => `
                        <div class="vote-result-item">
                            <span>${option.text}</span>
                            <span>${option.votes || 0} votes</span>
                        </div>
                        <div class="vote-progress">
                            <div class="vote-progress-bar" style="width: ${totalVotes > 0 ? ((option.votes || 0) / totalVotes * 100) : 0}%"></div>
                        </div>
                    `).join('') : ''}
                </div>
            ` : `
                <form class="vote-form" data-poll-id="${poll.id}">
                    <div class="vote-options">
                        ${poll.options ? poll.options.map((option, index) => `
                            <label class="vote-option">
                                <input type="radio" name="vote" value="${index}" required>
                                <span>${option.text}</span>
                            </label>
                        `).join('') : ''}
                    </div>
                    <button type="submit" class="btn">Submit Vote</button>
                </form>
            `}
        </div>
    `;
}

// Handle vote submission
async function handleVote(e) {
    e.preventDefault();
    
    const form = e.target;
    const pollId = form.getAttribute('data-poll-id');
    const selectedOption = parseInt(form.querySelector('input[name="vote"]:checked').value);
    
    try {
        // Update vote count in Firestore
        const pollRef = doc(db, 'polls', pollId);
        const optionPath = `options.${selectedOption}.votes`;
        
        await updateDoc(pollRef, {
            [optionPath]: increment(1)
        });
        
        // Reload votes to show updated results
        await loadVotes();
        
        alert('Thank you for voting!');
        
    } catch (error) {
        console.error('Error submitting vote:', error);
        alert('Error submitting vote. Please try again.');
    }
}

// Utility function to format dates
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
        month: 'long',
        day: 'numeric'
    });
}

// Export functions for admin use
window.futogist = {
    db,
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    getDocs,
    query,
    orderBy
};
