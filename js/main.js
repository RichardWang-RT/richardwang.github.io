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

    container.innerHTML = posts.map(post => `
        <article class="post-card">
            <div class="post-card-content">
                <h3><a href="post.html?id=${post.id}">${post.title}</a></h3>
                <div class="post-meta">
                    <span>${formatDate(post.date)}</span>
                    <span>•</span>
                    <span>${post.author}</span>
                </div>
                <p class="post-excerpt">${post.excerpt}</p>
                <a href="post.html?id=${post.id}" class="read-more">Read more →</a>
            </div>
        </article>
    `).join('');
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