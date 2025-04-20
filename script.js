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

    // --- Configuration ---
    // Option 1: Manually list your video IDs here.
    // This is simpler to start but requires manual updates.
    const videoIds = [
        "VIDEO_ID_1", // Replace with actual video IDs
        "VIDEO_ID_2",
        "VIDEO_ID_3",
        "dQw4w9WgXcQ", // Example placeholder
        "your_actual_video_id_here"
        // Add all your video IDs from the 'data' folder filenames (without .json)
    ];

    // Option 2: Use a manifest file (Advanced - Requires setup)
    // If you have many files, generate a `video_ids.json` file
    // containing an array of IDs: `["ID1", "ID2", ...]`.
    // Then fetch it like this:
    // async function fetchVideoIds() {
    //     try {
    //         const response = await fetch('./video_ids.json'); // Adjust path if needed
    //         if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    //         const ids = await response.json();
    //         populateVideoList(ids);
    //     } catch (error) {
    //         console.error("Error fetching video ID list:", error);
    //         listLoadingElement.textContent = 'Error loading video list.';
    //         listLoadingElement.style.color = 'red';
    //     }
    // }
    // fetchVideoIds(); // Call this instead of populateVideoList(videoIds) below

    // --- Populate Video List ---
    function populateVideoList(ids) {
        if (!videoListElement) return;
        videoListElement.innerHTML = ''; // Clear loading message or previous list
        if (ids.length === 0) {
             videoListElement.innerHTML = '<li>No videos found.</li>';
             return;
        }

        ids.sort().forEach(id => { // Sort IDs alphabetically
            const listItem = document.createElement('li');
            const link = document.createElement('a');
            link.href = `#${id}`; // Use hash for navigation state
            link.textContent = id;
            link.dataset.videoId = id; // Store ID for easy access
            link.addEventListener('click', (e) => {
                e.preventDefault(); // Prevent default anchor jump
                loadComments(id);
                // Update active state
                document.querySelectorAll('#video-list a').forEach(a => a.classList.remove('active'));
                link.classList.add('active');
                // Update URL hash
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


    // --- Load and Display Comments ---
    async function loadComments(videoId) {
        if (!videoId) return;

        // Update UI state
        currentVideoTitleElement.textContent = `Comments for: ${videoId}`;
        youtubeLinkElement.href = `https://www.youtube.com/watch?v=${videoId}`;
        videoLinkContainer.style.display = 'block';
        commentsContainer.innerHTML = ''; // Clear previous comments
        errorMessageElement.style.display = 'none'; // Hide previous errors
        loadingIndicator.style.display = 'block'; // Show loading indicator

        try {
            const response = await fetch(`./data/${videoId}.json`);
            if (!response.ok) {
                throw new Error(`Could not load comments. Status: ${response.status}`);
            }
            const text = await response.text(); // Read response as text (for NDJSON)

            // Parse NDJSON (Newline Delimited JSON)
            const comments = text.trim().split('\n')
                .filter(line => line.trim() !== '') // Remove empty lines
                .map((line, index) => {
                    try {
                        return JSON.parse(line);
                    } catch (parseError) {
                        console.error(`Error parsing line ${index + 1} in ${videoId}.json:`, parseError, "Line content:", line);
                        return null; // Skip lines that fail to parse
                    }
                })
                .filter(comment => comment !== null); // Filter out skipped lines

            renderComments(comments, videoId);

        } catch (error) {
            console.error(`Error loading comments for ${videoId}:`, error);
            errorMessageElement.textContent = `Failed to load comments for ${videoId}. ${error.message}. Check if the file exists in the 'data' folder and is correctly formatted.`;
            errorMessageElement.style.display = 'block';
            commentsContainer.innerHTML = '<p>Could not load comments.</p>'; // Clear area
        } finally {
            loadingIndicator.style.display = 'none'; // Hide loading indicator
        }
    }

    // --- Render Comments to HTML ---
    function renderComments(comments, videoId) {
        commentsContainer.innerHTML = ''; // Clear previous content or loading message

        if (comments.length === 0) {
            commentsContainer.innerHTML = '<p>No comments found for this video (or the file is empty/invalid).</p>';
            return;
        }

        const fragment = document.createDocumentFragment(); // More efficient for appending many elements

        comments.forEach(comment => {
            const commentElement = document.createElement('div');
            commentElement.className = 'comment';

            // Sanitize potentially unsafe values (basic example)
            const safeText = comment.text.replace(/</g, "<").replace(/>/g, ">");
            const safeAuthor = (comment.author || 'Unknown Author').replace(/</g, "<").replace(/>/g, ">");
            const safeTime = (comment.time || 'Unknown time').replace(/</g, "<").replace(/>/g, ">");
            const safeVotes = (comment.votes || '0').replace(/</g, "<").replace(/>/g, ">");
            const safeReplies = (comment.replies || '0').replace(/</g, "<").replace(/>/g, ">"); // Assuming 'replies' might be a count

            // Construct author channel link
            const authorChannelLink = comment.channel ? `https://www.youtube.com/channel/${comment.channel}` : '#';
            const authorTarget = comment.channel ? '_blank' : '_self';

            commentElement.innerHTML = `
                <div class="comment-photo">
                    <img src="${comment.photo || 'placeholder.png'}" alt="${safeAuthor}'s profile picture" loading="lazy">
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
                        ${comment.replies ? `<span class="comment-replies">${safeReplies} Replies</span>` : ''}
                        ${comment.heart ? '<span class="comment-heart">Hearted by Gura</span>' : ''}
                    </div>
                </div>
            `;
            // Add link to specific comment if CID is available
            const commentLink = `https://www.youtube.com/watch?v=${videoId}&lc=${comment.cid}`;
            const timeElement = commentElement.querySelector('.comment-time');
            if (timeElement && comment.cid) {
                 const linkElement = document.createElement('a');
                 linkElement.href = commentLink;
                 linkElement.target = '_blank';
                 linkElement.rel = 'noopener noreferrer';
                 linkElement.style.color = 'inherit'; // Inherit color from time span
                 linkElement.style.textDecoration = 'none'; // Remove underline initially
                 linkElement.textContent = timeElement.textContent; // Move text content to link
                 linkElement.title = timeElement.title; // Move title to link
                 timeElement.textContent = ''; // Clear original span text
                 timeElement.appendChild(linkElement); // Add link inside the span
                 timeElement.style.cursor = 'pointer';
                 timeElement.onmouseover = () => linkElement.style.textDecoration = 'underline';
                 timeElement.onmouseout = () => linkElement.style.textDecoration = 'none';
            }


            fragment.appendChild(commentElement);
        });

        commentsContainer.appendChild(fragment);
    }

    // --- Initial Load ---
    populateVideoList(videoIds); // Use Option 1 (manual list) by default

    // Check URL hash on load to potentially load a video directly
    const initialVideoId = window.location.hash.substring(1);
    if (initialVideoId && videoIds.includes(initialVideoId)) {
        loadComments(initialVideoId);
        // Highlight the corresponding link in the list
        const activeLink = document.querySelector(`#video-list a[data-video-id="${initialVideoId}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
            // Scroll list item into view
             activeLink.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }
});