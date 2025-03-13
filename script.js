function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('open');
}
document.addEventListener('DOMContentLoaded', function () {
    var flashMessage = document.getElementById('flash-message');
    if (flashMessage) {
        setTimeout(function () {
            flashMessage.style.display = 'none';
        }, 2000);
    }
});
// Handle signup form submission
document.getElementById('signupForm').addEventListener('submit', function (event) {
    event.preventDefault();

    const formData = new FormData(this);
    fetch('/signup', {
        method: 'POST',
        body: formData,
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.message === 'Sign Up Successful') {
                alert('Sign Up Successful!');
                const modal = bootstrap.Modal.getInstance(document.getElementById('signupModal'));
                modal.hide();
            } else {
                alert('Sign Up Failed!');
            }
        })
        .catch((error) => {
            console.error('Error:', error);
            alert('Something went wrong!');
        });
});

// Handle signin form submission
document.getElementById('signinForm').addEventListener('submit', function (event) {
    event.preventDefault();

    const formData = new FormData(this);
    fetch('/signin', {
        method: 'POST',
        body: formData,
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.message === 'Sign In Successful') {
                alert('Sign In Successful!');
                const modal = bootstrap.Modal.getInstance(document.getElementById('signinModal'));
                modal.hide();
            } else {
                alert('Sign In Failed!');
            }
        })
        .catch((error) => {
            console.error('Error:', error);
            alert('Something went wrong!');
        });
});

let likeCount = 0;
let dislikeCount = 0;
let userAction = null; // Tracks user's action: 'like', 'dislike', or null

function likeMovie() {
    if (userAction === 'like') {
        // If already liked, undo the like
        likeCount--;
        userAction = null;
    } else {
        // If disliked before, undo the dislike
        if (userAction === 'dislike') {
            dislikeCount--;
        }
        // Add the like
        likeCount++;
        userAction = 'like';
    }
    updateCounts();
}

function dislikeMovie() {
    if (userAction === 'dislike') {
        // If already disliked, undo the dislike
        dislikeCount--;
        userAction = null;
    } else {
        // If liked before, undo the like
        if (userAction === 'like') {
            likeCount--;
        }
        // Add the dislike
        dislikeCount++;
        userAction = 'dislike';
    }
    updateCounts();
}

function updateCounts() {
    document.getElementById("likeCount").textContent = likeCount;
    document.getElementById("dislikeCount").textContent = dislikeCount;
}



// Clear the movie container
function clearMovieContainer() {
    const movieContainer = document.getElementById('movie-container');
    movieContainer.innerHTML = ''; // Clear all existing content
}

// Clear the search results container
function clearSearchResults() {
    const searchResults = document.getElementById('search-results');
    searchResults.innerHTML = ''; // Clear all existing content
}

// Fetch Bollywood movies
function showLoading() {
    document.getElementById('loading').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

// Fetch Bollywood Movies
function fetchBollywoodMovies() {
    clearUpcomingMovies();
    clearSearchResults();
    clearMovieContainer();
    showLoading();

    const movieContainer = document.getElementById('movie-container');
    // showSkeletons(movieContainer, 5);


    fetch('/bollywood_movies')
        .then(response => response.json())
        .then(data => {
            // hideSkeletons(movieContainer);
            movieContainer.innerHTML = '';

            if (data.movies && data.movies.length > 0) {
                data.movies.forEach(movie => {
                    const movieDiv = document.createElement('div');
                    movieDiv.classList.add('movie');
                    movieDiv.innerHTML = `
                <img src="${movie.poster_url || 'https://via.placeholder.com/500x750?text=No+Image+Available'}" alt="${movie.title || 'Movie Poster'}">
                <h3>${movie.title || 'Unknown Title'}</h3>
            `;
                    movieDiv.addEventListener('click', function () {
                        fetchMovieDetails(movie.id);
                    });

                    movieContainer.appendChild(movieDiv);
                });
            } else {
                movieContainer.innerHTML = '<p>No Bollywood movies available.</p>';
            }
        })
        .catch(error => {
            // hideSkeletons(movieContainer);
            console.error('Error fetching Bollywood movies:', error);
        })
        .finally(() => {
            hideLoading(); // Hide loading animation
        });
}
// Fetch Movies by Genre
function fetchMoviesByGenre(genreId) {
    clearUpcomingMovies();
    clearSearchResults();
    clearMovieContainer();
    showLoading();

    const movieContainer = document.getElementById('movie-container');
    fetch(`/genre_movie`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ genre_id: genreId })
    })
        .then(response => response.json())
        .then(data => {
            movieContainer.innerHTML = '';

            if (data.movies && data.movies.length > 0) {
                data.movies.forEach(movie => {
                    const movieDiv = document.createElement('div');
                    movieDiv.classList.add('movie');
                    movieDiv.innerHTML = `
                <img src="${movie.poster_url || 'https://via.placeholder.com/500x750?text=No+Image+Available'}" alt="${movie.title || 'Movie Poster'}">
                <h3>${movie.title || 'Unknown Title'}</h3>
            `;
                    movieDiv.addEventListener('click', function () {
                        fetchMovieDetails(movie.id);
                    });

                    movieContainer.appendChild(movieDiv);
                });
            } else {
                movieContainer.innerHTML = '<p>No movies available for this genre.</p>';
            }
        })
        .catch(error => {
            console.error('Error fetching genre movies:', error);
        })
        .finally(() => {
            hideLoading(); // Hide loading animation
        });
}

// Event Delegation for Genre and Bollywood Buttons
document.addEventListener('click', function (event) {
    if (event.target.classList.contains('genre-item')) {
        const genreId = event.target.dataset.id;
        fetchMoviesByGenre(genreId);
    } else if (event.target.id === 'bollywood-button') {
        fetchBollywoodMovies();
    }
});
// Utility Functions
// Utility Functions
function clearSearchResults() {
    document.getElementById('results').innerHTML = '';
}

function clearMovieContainer() {
    const container = document.getElementById('movie-container');
    if (container) container.innerHTML = '';
}

// Search Movies Function
function searchMovies() {
    const query = document.getElementById('searchQuery').value.trim();
    const resultsDiv = document.getElementById('results');

    // Clear previous results
    clearUpcomingMovies();
    clearSearchResults();
    clearMovieContainer();
    showLoading();

    if (!query) {
        alert('Please enter a movie name!');
        return;
    }

    // Fetch movie data
    fetch('/search_movie', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: query })
    })
        .then(response => response.json())
        .then(data => {
            if (data.movies && data.movies.length > 0) {
                data.movies.forEach(movie => {
                    const movieDiv = document.createElement('div');
                    movieDiv.classList.add('movie');
                    movieDiv.innerHTML = `
            <img src="${movie.poster_url || 'https://via.placeholder.com/500x750?text=No+Image+Available'}" alt="${movie.title || 'Movie Poster'}">
            <h3>${movie.title || 'Unknown Title'}</h3>
        `;

                    // Add event listener to fetch movie details when clicked
                    movieDiv.addEventListener('click', function () {
                        fetchMovieDetails(movie.id);
                    });

                    resultsDiv.appendChild(movieDiv);
                });
            } else {
                resultsDiv.innerHTML = `<p>No movies found. Try a different search term.</p>`;
            }
        })
        .catch(error => {
            console.error('Error:', error);
            resultsDiv.innerHTML = `<p>An error occurred. Please try again later.</p>`;
        })
        .finally(() => {
            hideLoading(); // Hide loading animation
        });
}

// Movie Details Function (Example Implementation)
function fetchMovieDetails(movieId) {
    fetch(`/movie_details/${movieId}`)
        .then(response => response.json())
        .then(movie => {
            document.getElementById('modalTitle').innerText = movie.title;
            document.getElementById('modalPoster').src = movie.poster_url;
            document.getElementById('modalOverview').innerText = movie.overview;
            document.getElementById('modalReleaseDate').innerText = `Released: ${movie.release_date}`;
            document.getElementById('modalRating').innerText = `Rating: ${movie.rating}/10`;

            // Show modal
            document.getElementById('modal').style.display = 'block';
        })
        .catch(error => console.error('Error fetching details:', error));
}

// UI Functions
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('collapsed');
}

function closeModal() {
    const modal = document.getElementById('modal');
    const trailerContainer = document.getElementById('modalTrailerContainer');
    trailerContainer.innerHTML = ''; // Clear trailer iframe
    modal.style.display = 'none';
}

// Event Listeners
document.addEventListener('click', function (event) {
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.querySelector('.sidebar-toggle');

    if (!sidebar.contains(event.target) && !sidebarToggle.contains(event.target)) {
        sidebar.classList.add('collapsed');
    }
});
function fetchMovieDetails(movieId) {
    fetch('/get_movie_details', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ movie_ids: [movieId] })
    })
        .then(response => response.json())
        .then(data => {
            if (data.movies && data.movies.length > 0) {
                const movie = data.movies[0];
                const movieTitle = movie.title || 'Unknown Title';

                // Populate modal with movie details
                document.getElementById('modalTitle').innerText = movieTitle;
                document.getElementById('modalOverview').innerText = movie.overview || 'No overview available.';
                document.getElementById('modalReleaseDate').innerText = movie.release_date || 'N/A';
                document.getElementById('modalRating').innerText = movie.vote_average || 'N/A';

                // Fetch trailer link from TMDb API
                fetch(`/get_movie_trailer/${movieId}`)
                    .then(response => response.json())
                    .then(data => {
                        const trailerContainer = document.getElementById('modalTrailerContainer');

                        if (data.trailer_url) {
                            // If trailer is available, embed the video from TMDb
                            const iframe = document.createElement('iframe');
                            iframe.src = `${data.trailer_url}?enablejsapi=1`; // Add enablejsapi=1
                            iframe.width = '100%';
                            iframe.height = '315';
                            iframe.frameBorder = '0';
                            iframe.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture';
                            iframe.allowFullscreen = true;

                            // Clear previous trailer content and append the iframe
                            trailerContainer.innerHTML = '';  // Clear previous content
                            trailerContainer.appendChild(iframe);
                        } else {
                            // If no trailer, show "Trailer not available" message
                            trailerContainer.innerHTML = '<p>Trailer not available</p>';
                        }

                        // Set the Download link dynamically
                        const downloadLink = `https://uhdmovies.beer/search/${encodeURIComponent(movieTitle)}`;
                        document.getElementById('modalDownloadLink').href = downloadLink;

                        // Show modal with movie details and trailer (if available)
                        document.getElementById('modal').style.display = 'block';
                    })
                    .catch(error => {
                        console.error('Error fetching trailer:', error);
                        alert('Failed to fetch trailer.');
                    });
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Failed to fetch movie details.');
        });
}
// Fetch now playing movies on page load
document.addEventListener('DOMContentLoaded', function () {
    const movieContainer = document.getElementById('movie-container');
    clearUpcomingMovies();
    showLoading();

    fetch('/now_playing')
        .then(response => response.json())
        .then(data => {
            movieContainer.innerHTML = '';

            if (data.movies && data.movies.length > 0) {
                data.movies.forEach(movie => {
                    const movieDiv = document.createElement('div');
                    movieDiv.classList.add('movie');

                    const movieImage = document.createElement('img');
                    movieImage.src = movie.poster_url || 'https://via.placeholder.com/500x750?text=No+Image+Available';
                    movieDiv.appendChild(movieImage);

                    const movieTitle = document.createElement('h3');
                    movieTitle.textContent = movie.title || 'Unknown Title';
                    movieDiv.appendChild(movieTitle);

                    movieDiv.addEventListener('click', function () {
                        fetchMovieDetails(movie.id);
                    });

                    movieContainer.appendChild(movieDiv);
                });
            } else {
                movieContainer.innerHTML = '<p>No movies available at the moment.</p>';
            }
        })
        .catch(error => {
            console.error('Error fetching movies:', error);
        })
        .finally(() => {
            hideLoading(); // Hide loading animation
        });
});



// Fetch the movie trailer URL from the Flask backend
async function fetchMovieTrailer() {
    const movieTitle = document.getElementById('movieTitle').value;
    if (!movieTitle) {
        alert("Please enter a movie title.");
        return;
    }

    try {
        // Fetch movie ID
        const responseId = await fetch(`/get_movie_id/${movieTitle}`);
        const dataId = await responseId.json();
        if (dataId.error) {
            alert("Movie not found.");
            return;
        }

        const movieId = dataId.movie_id;

        // Fetch trailer URL using movie ID
        const responseTrailer = await fetch(`/get_movie_trailer/${movieId}`);
        const dataTrailer = await responseTrailer.json();
        if (dataTrailer.error) {
            alert("Trailer not found.");
            return;
        }

        // Open modal and set trailer URL
        document.getElementById('modalTitle').textContent = movieTitle;
        document.getElementById('modalYouTubeLink').href = dataTrailer.trailer_url;
        document.getElementById('modalYouTubeLink').textContent = 'Watch Trailer';
        document.getElementById('modal').style.display = 'block';
    } catch (error) {
        alert("Error fetching data.");
    }
}

// Close modal function
function closeModal() {
    document.getElementById('modal').style.display = 'none';
}

function recommendMovies() {
    const query = document.getElementById('searchQuery').value.trim();
    const resultsDiv = document.getElementById('results');
    clearUpcomingMovies();
    showLoading();
    

    if (!query) {
        alert('Please enter a movie name!');
        return;
    }

    fetch('/recommend', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title: query })
    })
        .then(response => response.json())
        .then(data => {
            resultsDiv.innerHTML = ''; // Clear previous results

            if (data.searched_movie) {
                // Render the searched movie
                const searchedMovieDiv = document.createElement('div');
                searchedMovieDiv.classList.add('movie');
                searchedMovieDiv.innerHTML = `
        <h2>Searched Movie:</h2>
        <img src="${data.searched_movie.poster_url || 'https://via.placeholder.com/500x750?text=No+Image+Available'}" alt="${data.searched_movie.title || 'Movie Poster'}">
        <h3>${data.searched_movie.title || 'Unknown Title'}</h3>
    `;
                searchedMovieDiv.addEventListener('click', function () {
                    fetchMovieDetails(data.searched_movie.id);
                });
                resultsDiv.appendChild(searchedMovieDiv);
            }

            if (data.recommended_movies && data.recommended_movies.length > 0) {
                // Render the recommendations

                data.recommended_movies.forEach(movie => {
                    const movieDiv = document.createElement('div');
                    movieDiv.classList.add('movie');
                    movieDiv.innerHTML = `
            <img src="${movie.poster_url || 'https://via.placeholder.com/500x750?text=No+Image+Available'}" alt="${movie.title || 'Movie Poster'}">
            <h3>${movie.title || 'Unknown Title'}</h3>`;
                    movieDiv.addEventListener('click', function () {
                        fetchMovieDetails(movie.id);
                    });
                    resultsDiv.appendChild(movieDiv);
                });
            } else {
                resultsDiv.innerHTML += `<p>No recommendations found for "${query}". Try another movie!</p>`;
            }
        })
        .catch(error => {
            console.error('Error:', error);
            resultsDiv.innerHTML = `<p>An error occurred. Please try again later.</p>`;
        })
        .finally(() => {
            hideLoading(); // Hide loading animation
        });
}

// JavaScript to toggle the sidebar
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('collapsed');
}


function clearUpcomingMovies() {
const upcomingMoviesContainer = document.getElementById('upcoming-movies');
upcomingMoviesContainer.innerHTML = ''; // Clear the container
}
// Fetch and display upcoming movies
async function fetchUpcomingMovies() {
    const upcomingMoviesContainer = document.getElementById('upcoming-movies');
    upcomingMoviesContainer.innerHTML = ''; // Clear previous content

    try {
        const response = await fetch('/upcoming_movies');
        const data = await response.json();

        if (data.movies && data.movies.length > 0) {
            data.movies.forEach(movie => {
                const movieDiv = document.createElement('div');
                movieDiv.classList.add('movie');
                movieDiv.innerHTML = `
            <img src="${movie.poster_url || 'https://via.placeholder.com/500x750?text=No+Image+Available'}" alt="${movie.title || 'Movie Poster'}">
            <h3>${movie.title || 'Unknown Title'}</h3>
            <p>Release Date: ${movie.release_date || 'N/A'}</p>
            <p>Rating: ${movie.vote_average || 'N/A'}</p>
        `;
                movieDiv.addEventListener('click', function () {
                    fetchMovieDetails(movie.id); // Function to fetch movie details
                });
                upcomingMoviesContainer.appendChild(movieDiv);
            });
        } else {
            upcomingMoviesContainer.innerHTML = '<p>No upcoming movies available.</p>';
        }
    } catch (error) {
        console.error('Error fetching upcoming movies:', error);
        upcomingMoviesContainer.innerHTML = '<p>Failed to load upcoming movies. Please try again later.</p>';
    }
}

// Add event listener to the "Upcoming Movies" button
document.getElementById('upcoming-movies-btn').addEventListener('click', function (event) {
    event.preventDefault(); // Prevent default link behavior
    fetchUpcomingMovies(); // Fetch and display upcoming movies
});
