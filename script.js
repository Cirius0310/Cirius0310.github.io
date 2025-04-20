document.addEventListener('DOMContentLoaded', () => {
    const videoListElement = document.getElementById('video-list');
    const listLoadingElement = document.getElementById('list-loading');
    const commentsContainer = document.getElementById('comments');
    const currentVideoTitleElement = document.getElementById('current-video-title');
    const videoLinkContainer = document.getElementById('video-link-container');
    const youtubeLinkElement = document.getElementById('youtube-link');
    const loadingIndicator = document.getElementById('loading-indicator');
    const errorMessageElement = document.getElementById('error-message');
    const videoFilterInput = document.getElementById('video-filter');

    let availableVideoIds = []; // Store fetched video IDs globally within the scope

    // --- Fetch Video List from Manifest ---
    async function loadVideoList() {
        if (!videoListElement || !listLoadingElement) return;
        listLoadingElement.textContent = 'Loading video list...';
        listLoadingElement.style.display = 'block'; // Ensure it's visible

        try {
            const response = await fetch('./manifest.json'); // Fetch the generated manifest
            if (!response.ok) {
                 // Try fetching from data/manifest.json as a fallback (less ideal)
                 console.warn("manifest.json not found at root, trying ./data/manifest.json");
                 const fallbackResponse = await fetch('./data/manifest.json');
                 if (!fallbackResponse.ok) {
                    throw new Error(`HTTP error! Status: ${response.status} (and fallback failed)`);
                 }
                 availableVideoIds = await fallbackResponse.json();
            } else {
                 availableVideoIds = await response.json();
            }


            if (!Array.isArray(availableVideoIds)) {
                throw new Error("Manifest file does not contain a valid JSON array.");
            }

            populateVideoList(availableVideoIds);
            checkUrlHashForInitialLoad(); // Check hash *after* list is loaded

        } catch (error) {
            console.error("Error loading or parsing manifest.json:", error);
            videoListElement.innerHTML = ''; // Clear list area
            listLoadingElement.textContent = 'Error loading video list. Make sure manifest.json exists and is valid.';
            listLoadingElement.style.color = 'red';
        }
    }

    // --- Populate Video List (Now uses fetched IDs) ---
    function populateVideoList(ids) {
        videoListElement.innerHTML = ''; // Clear loading message
        listLoadingElement.style.display = 'none'; // Hide loading message

        if (ids.length === 0) {
             const li = document.createElement('li');
             li.textContent = 'No videos found in manifest.';
             li.style.fontStyle = 'italic';
             li.style.color = '#888';
             videoListElement.appendChild(li);
             return;
        }

        // No need to sort here if manifest generation script already sorts
        ids.forEach(id => {
            const listItem = document.createElement('li');
            const link = document.createElement('a');
            link.href = `#${id}`;
            link.textContent = id;
            link.dataset.videoId = id;
            link.addEventListener('click', (e) => {
                e.preventDefault();
                loadComments(id);
                document.querySelectorAll('#video-list a').forEach(a => a.classList.remove('active'));
                link.classList.add('active');
                window.location.hash = id;
            });
            listItem.appendChild(link);
            videoListElement.appendChild(listItem);
        });
    }

    // --- Filter Video List ---
    videoFilterInput.addEventListener('input', () => {
        const filterText = videoFilterInput.value.toLowerCase();
        const items = videoListElement.querySelectorAll('li');
        items.forEach(item => {
            const videoId = item.querySelector('a')?.dataset.videoId?.toLowerCase() || '';
            if (videoId.includes(filterText)) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });
    });

    // --- Load and Display Comments (No changes needed here) ---
    async function loadComments(videoId) {
        if (!videoId) return;

        currentVideoTitleElement.textContent = `Comments for: ${videoId}`;
        youtubeLinkElement.href = `https://www.youtube.com/watch?v=${videoId}`;
        videoLinkContainer.style.display = 'block';
        commentsContainer.innerHTML = '';
        errorMessageElement.style.display = 'none';
        loadingIndicator.style.display = 'block';

        try {
            const response = await fetch(`./data/${videoId}.json`);
            if (!response.ok) {
                throw new Error(`Could not load comments. Status: ${response.status}`);
            }
            const text = await response.text();
            const comments = text.trim().split('\n')
                .filter(line => line.trim() !== '')
                .map((line, index) => {
                    try {
                        return JSON.parse(line);
                    } catch (parseError) {
                        console.error(`Error parsing line ${index + 1} in ${videoId}.json:`, parseError, "Line content:", line);
                        return null;
                    }
                })
                .filter(comment => comment !== null);

            renderComments(comments, videoId);

        } catch (error) {
            console.error(`Error loading comments for ${videoId}:`, error);
            errorMessageElement.textContent = `Failed to load comments for ${videoId}. ${error.message}. Check if the file exists in the 'data' folder and is correctly formatted.`;
            errorMessageElement.style.display = 'block';
            commentsContainer.innerHTML = '<p>Could not load comments.</p>';
        } finally {
            loadingIndicator.style.display = 'none';
        }
    }

    // --- Render Comments to HTML (No changes needed here) ---
    function renderComments(comments, videoId) {
        commentsContainer.innerHTML = '';

        if (comments.length === 0) {
            commentsContainer.innerHTML = '<p>No comments found for this video (or the file is empty/invalid).</p>';
            return;
        }

        const fragment = document.createDocumentFragment();

        comments.forEach(comment => {
            const commentElement = document.createElement('div');
            commentElement.className = 'comment';

            const safeText = comment.text?.replace(/</g, "<").replace(/>/g, ">") || '';
            const safeAuthor = (comment.author || 'Unknown Author').replace(/</g, "<").replace(/>/g, ">");
            const safeTime = (comment.time || 'Unknown time').replace(/</g, "<").replace(/>/g, ">");
            const safeVotes = (comment.votes || '0').replace(/</g, "<").replace(/>/g, ">");
            const safeReplies = (comment.replies || '0').replace(/</g, "<").replace(/>/g, ">");

            const authorChannelLink = comment.channel ? `https://www.youtube.com/channel/${comment.channel}` : '#';
            const authorTarget = comment.channel ? '_blank' : '_self';

            commentElement.innerHTML = `
                <div class="comment-photo">
                    <img src="${comment.photo || 'placeholder.png'}" alt="${safeAuthor}'s profile picture" loading="lazy" onerror="this.style.display='none'"> <!-- Hide broken images -->
                </div>
                <div class="comment-content">
                    <div class="comment-header">
                        <a href="${authorChannelLink}" target="${authorTarget}" rel="noopener noreferrer" class="comment-author">${safeAuthor}</a>
                        <span class="comment-time" title="Parsed timestamp: ${comment.time_parsed ? new Date(comment.time_parsed * 1000).toLocaleString() : 'N/A'}">${safeTime}</span>
                        ${comment.reply ? '<span class="comment-tag">[Reply]</span>' : ''}
                    </div>
                    <div class="comment-text">${safeText.replace(/\n/g, '<br>')}</div>
                    <div class="comment-meta">
                        <span class="comment-votes">${safeVotes}</span>
                        ${comment.replies && comment.replies !== "0" ? `<span class="comment-replies">${safeReplies} Replies</span>` : ''}
                        ${comment.heart ? '<span class="comment-heart">Hearted by Gura</span>' : ''}
                    </div>
                </div>
            `;

            const commentLink = `https://www.youtube.com/watch?v=${videoId}&lc=${comment.cid}`;
            const timeElement = commentElement.querySelector('.comment-time');
            if (timeElement && comment.cid) {
                 const linkElement = document.createElement('a');
                 linkElement.href = commentLink;
                 linkElement.target = '_blank';
                 linkElement.rel = 'noopener noreferrer';
                 linkElement.style.color = 'inherit';
                 linkElement.style.textDecoration = 'none';
                 linkElement.textContent = timeElement.textContent;
                 linkElement.title = timeElement.title;
                 timeElement.textContent = '';
                 timeElement.appendChild(linkElement);
                 timeElement.style.cursor = 'pointer';
                 timeElement.onmouseover = () => linkElement.style.textDecoration = 'underline';
                 timeElement.onmouseout = () => linkElement.style.textDecoration = 'none';
            }

            fragment.appendChild(commentElement);
        });

        commentsContainer.appendChild(fragment);
    }

     // --- Check URL Hash on Load ---
    function checkUrlHashForInitialLoad() {
        const initialVideoId = window.location.hash.substring(1);
        if (initialVideoId && availableVideoIds.includes(initialVideoId)) {
            loadComments(initialVideoId);
            const activeLink = document.querySelector(`#video-list a[data-video-id="${initialVideoId}"]`);
            if (activeLink) {
                document.querySelectorAll('#video-list a').forEach(a => a.classList.remove('active')); // Clear others first
                activeLink.classList.add('active');
                activeLink.scrollIntoView({ behavior: 'auto', block: 'nearest' }); // Use auto for instant scroll
            }
        } else if (availableVideoIds.length > 0) {
            // Optional: Load the first video in the list if no hash is provided or hash is invalid
            // loadComments(availableVideoIds[0]);
            // const firstLink = document.querySelector('#video-list a');
            // if (firstLink) firstLink.classList.add('active');
            // window.location.hash = availableVideoIds[0]; // Optionally update hash
        } else {
             // No videos loaded, ensure placeholder text is shown
             commentsContainer.innerHTML = '<p>Select a video from the list on the left (if available) to view comments.</p>';
             currentVideoTitleElement.textContent = 'Select a Video';
             videoLinkContainer.style.display = 'none';
        }
    }

    // --- Initial Load ---
    loadVideoList(); // Start by fetching the manifest

});