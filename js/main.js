// Load posts data and render homepage
async function loadPosts() {
    try {
        const response = await fetch('posts.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const posts = await response.json();
        renderPosts(posts);
    } catch (error) {
        console.error('Error loading posts:', error);
        const container = document.getElementById('posts-container');
        if (container) {
            container.innerHTML = `<p>Error loading posts: ${error.message}. Make sure you're running a local server.</p>`;
        }
    }
}

// Render posts on homepage
function renderPosts(posts) {
    const container = document.getElementById('posts-container');
    if (!container) return;

    container.innerHTML = posts.map((post, index) => `
        <article class="post-card">
            <div class="post-card-content">
                <div id="post-display-${index}" class="post-display">
                    <p id="post-placeholder-${index}" style="color: #aaa; text-align: center; display: none;">Click edit to add content</p>
                </div>
                <div id="post-editor-${index}" style="display: none;">
                    <textarea id="post-textarea-${index}" rows="4" style="width: 100%; padding: 0.5rem; border: 1px solid #e5e7eb; border-radius: 4px; font-family: 'Georgia', serif; font-size: 0.9rem; resize: vertical;"></textarea>
                    <button onclick="savePostEdit(${index})" style="margin-top: 0.5rem; padding: 0.3rem 0.8rem; font-size: 0.8rem; cursor: pointer;">Save</button>
                </div>
                <button class="edit-btn" onclick="unlockPostEdit(${index})" style="margin-top: 0.5rem; padding: 0.25rem 0.6rem; font-size: 0.75rem; cursor: pointer; display: none;">Edit</button>
            </div>
        </article>
    `).join('');

    // Load saved content from localStorage
    posts.forEach(function(_, index) {
        var text = localStorage.getItem('post-frame-' + index);
        if (text) {
            var display = document.getElementById('post-display-' + index);
            if (display) {
                display.innerHTML = '<p style="white-space: pre-wrap; margin: 0;">' + escapeHtml(text) + '</p>';
            }
            var textarea = document.getElementById('post-textarea-' + index);
            if (textarea) textarea.value = text;
        }
    });

    // Show edit buttons and placeholder only when logged in
    var isAdmin = sessionStorage.getItem('is-admin') === 'true';
    if (isAdmin) {
        var allBtns = document.querySelectorAll('.post-card .edit-btn');
        allBtns.forEach(function(btn) { btn.style.display = ''; });
        // Show placeholder hint on empty frames
        posts.forEach(function(_, index) {
            if (!localStorage.getItem('post-frame-' + index)) {
                var ph = document.getElementById('post-placeholder-' + index);
                if (ph) ph.style.display = '';
            }
        });
    }
}

// Save post frame edit
function savePostEdit(index) {
    var value = document.getElementById('post-textarea-' + index).value;
    var display = document.getElementById('post-display-' + index);
    if (value) {
        localStorage.setItem('post-frame-' + index, value);
        if (display) {
            display.innerHTML = '<p style="white-space: pre-wrap; margin: 0;">' + escapeHtml(value) + '</p>';
        }
    } else {
        localStorage.removeItem('post-frame-' + index);
        if (display) {
            display.innerHTML = '<p id="post-placeholder-' + index + '" style="color: #aaa; text-align: center; display: none;">Click edit to add content</p>';
        }
    }
    document.getElementById('post-display-' + index).style.display = '';
    document.getElementById('post-editor-' + index).style.display = 'none';
}

// Unlock post frame edit
function unlockPostEdit(index) {
    if (sessionStorage.getItem('is-admin') === 'true') {
        document.getElementById('post-display-' + index).style.display = 'none';
        document.getElementById('post-editor-' + index).style.display = '';
        document.getElementById('post-textarea-' + index).focus();
    } else {
        alert('Please click "Edit" in the nav to login first.');
    }
}

// Simple HTML escape utility
function escapeHtml(text) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
}

// Load single post
async function loadPost() {
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('id');

    if (!postId) {
        window.location.href = 'index.html';
        return;
    }

    try {
        // Load posts metadata
        const postsResponse = await fetch('posts.json');
        if (!postsResponse.ok) {
            throw new Error(`HTTP error! status: ${postsResponse.status}`);
        }
        const posts = await postsResponse.json();
        const post = posts.find(p => p.id === postId);

        if (!post) {
            document.getElementById('post-content').innerHTML = '<p>Post not found.</p>';
            return;
        }

        // Load markdown content
        const markdownResponse = await fetch(`posts/${postId}.md`);
        if (!markdownResponse.ok) {
            throw new Error(`HTTP error! status: ${markdownResponse.status}`);
        }
        const markdownContent = await markdownResponse.text();
        const htmlContent = marked.parse(markdownContent);

        // Render post
        document.title = `${post.title} - What's|Update`;
        document.getElementById('post-content').innerHTML = `
            <h1>${post.title}</h1>
            <div class="post-content">${htmlContent}</div>
        `;

        // Render post metadata
        document.querySelector('.post-author').textContent = `By ${post.author}`;
        document.querySelector('.post-date').textContent = formatDate(post.date);

        // Render tags
        const tagsContainer = document.querySelector('.post-tags');
        tagsContainer.innerHTML = post.tags.map(tag => `<span class="tag">${tag}</span>`).join('');

        // Load related posts
        loadRelatedPosts(posts, post);

        // Load Disqus comments
        loadDisqus(postId, post.title);

    } catch (error) {
        console.error('Error loading post:', error);
        const container = document.getElementById('post-content');
        if (container) {
            container.innerHTML = `<p>Error loading post: ${error.message}. Make sure you're running a local server.</p>`;
        }
    }
}

// Load related posts
function loadRelatedPosts(allPosts, currentPost) {
    const container = document.getElementById('related-posts-container');
    if (!container) return;

    // Find posts with matching tags (excluding current post)
    const relatedPosts = allPosts
        .filter(post => post.id !== currentPost.id)
        .filter(post => post.tags.some(tag => currentPost.tags.includes(tag)))
        .slice(0, 3);

    if (relatedPosts.length === 0) {
        container.innerHTML = '<p>No related posts found.</p>';
        return;
    }

    container.innerHTML = relatedPosts.map(post => `
        <div class="related-post">
            <h4><a href="post.html?id=${post.id}">${post.title}</a></h4>
            <span class="post-date">${formatDate(post.date)}</span>
        </div>
    `).join('');
}

// Format date
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

// Share post on social media
function sharePost(platform) {
    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(document.querySelector('.post-single h1').textContent);
    const text = encodeURIComponent(document.querySelector('.post-single h1').textContent);

    let shareUrl;

    switch (platform) {
        case 'twitter':
            shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${text}`;
            break;
        case 'facebook':
            shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
            break;
        case 'linkedin':
            shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
            break;
        default:
            return;
    }

    // Try Web Share API first (mobile)
    if (navigator.share) {
        navigator.share({
            title: title,
            url: window.location.href
        }).catch(console.error);
    } else {
        // Fallback to opening in new tab
        window.open(shareUrl, '_blank', 'width=600,height=400');
    }
}

// Load Disqus comments
function loadDisqus(identifier, title) {
    const disqus_config = function () {
        this.page.url = window.location.href;
        this.page.identifier = identifier;
        this.page.title = title;
    };

    // Create Disqus script
    const d = document;
    const s = d.createElement('script');
    s.src = 'https://YOUR_DISQUS_SHORTNAME.disqus.com/embed.js';
    s.setAttribute('data-timestamp', +new Date());
    (d.head || d.body).appendChild(s);
}

// Initialize based on current page
document.addEventListener('DOMContentLoaded', function () {
    if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
        loadPosts();

        // Home link toggle
        const homeLink = document.getElementById('home-link');
        const homeContent = document.getElementById('home-content');
        if (homeLink && homeContent) {
            homeLink.addEventListener('click', function (e) {
                e.preventDefault();
                if (homeContent.style.display === 'none') {
                    homeContent.style.display = 'block';
                } else {
                    homeContent.style.display = 'none';
                }
            });
        }
    } else if (window.location.pathname.endsWith('post.html')) {
        loadPost();
    }
});