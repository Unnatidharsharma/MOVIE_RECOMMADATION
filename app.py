from flask import Flask, request, jsonify, render_template, flash, redirect, url_for
import requests
import pickle
import pandas as pd
from flask_sqlalchemy import SQLAlchemy
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import pandas as pd
from fuzzywuzzy import process
# from surprise import Dataset, Reader, KNNBasic
app = Flask(__name__)

TMDB_API_KEY = '612f88fa557aa8ff9277ef6b491b70cb'
TMDB_BASE_URL = 'https://api.themoviedb.org/3/movie/'
TMDB_SEARCH_URL = 'https://api.themoviedb.org/3/search/movie'
TMDB_GENRE_URL = "https://api.themoviedb.org/3/discover/movie"
TMDB_CURR_URL = 'https://api.themoviedb.org/3/movie/now_playing'
TMDB_HINDI_MOVIES_URL = "https://api.themoviedb.org/3/discover/movie"

# Load the movie_dict.pkl file
with open('movie_dict.pkl', 'rb') as file:
    movie_dict = pickle.load(file)

# Convert the dictionary to a DataFrame for easier manipulation
movies_df = pd.DataFrame(movie_dict)

# Initialize TF-IDF Vectorizer
tfidf = TfidfVectorizer(stop_words='english')
tfidf_matrix = tfidf.fit_transform(movies_df['tags'])

# Compute the cosine similarity matrix
cosine_sim = cosine_similarity(tfidf_matrix, tfidf_matrix)

# database configuration---------------------------------------
app.secret_key = "alskdjfwoeieiurlskdjfslkdjffsr"
app.config['SQLALCHEMY_DATABASE_URI'] = "mysql://root:@localhost/first_database"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)


# Define your model class for the 'signup' table
class Signup(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), nullable=False)
    password = db.Column(db.String(100), nullable=False)

# Define your model class for the 'signup' table
class Signin(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), nullable=False)
    password = db.Column(db.String(100), nullable=False)

# Function to get recommendations based on movie title
def get_recommendations(title, cosine_sim=cosine_sim):
    idx = movies_df[movies_df['title'] == title].index[0]
    sim_scores = list(enumerate(cosine_sim[idx]))
    sim_scores = sorted(sim_scores, key=lambda x: x[1], reverse=True)
    sim_scores = sim_scores[1:11]  # Get top 10 similar movies
    movie_indices = [i[0] for i in sim_scores]
    return movies_df['title'].iloc[movie_indices]

@app.route('/')
def home():
    return render_template('index.html')

# this is for the recommnedation basically content based recommendation
@app.route('/recommend', methods=['POST'])
def recommend():
    data = request.json
    title = data.get('title', '')

    if not title:
        return jsonify({"error": "Title is required."}), 400

    try:
        # for fetch details of the searched movie
        params = {"api_key": TMDB_API_KEY, "query": title}
        search_response = requests.get(TMDB_SEARCH_URL, params=params)
        if search_response.status_code != 200 or not search_response.json().get("results"):
            return jsonify({"error": "Searched movie not found."}), 404
        searched_movie = search_response.json().get("results")[0]
        searched_movie_details = {
            "id": searched_movie.get("id"),
            "title": searched_movie.get("title"),
            "poster_url": f"https://image.tmdb.org/t/p/w500{searched_movie.get('poster_path')}" if searched_movie.get("poster_path") else None,
            "overview": searched_movie.get("overview"),
            "release_date": searched_movie.get("release_date"),
            "vote_average": searched_movie.get("vote_average"),
        }
        #for Get recommendations
        recommendations = get_recommendations(title)
        recommended_movies = []
        for movie_title in recommendations:
            params = {"api_key": TMDB_API_KEY, "query": movie_title}
            response = requests.get(TMDB_SEARCH_URL, params=params)
            if response.status_code == 200:
                results = response.json().get("results", [])
                if results:
                    movie = results[0]
                    recommended_movies.append({
                        "id": movie.get("id"),
                        "title": movie.get("title"),
                        "poster_url": f"https://image.tmdb.org/t/p/w500{movie.get('poster_path')}" if movie.get("poster_path") else None,
                        "overview": movie.get("overview"),
                        "release_date": movie.get("release_date"),
                        "vote_average": movie.get("vote_average"),
                    })
        return jsonify({
            "searched_movie": searched_movie_details,
            "recommended_movies": recommended_movies
        })
    except Exception as e:
        return jsonify({"error": "An unexpected error occurred.", "details": str(e)}), 500

# this is for the search purpose
@app.route('/search_movie', methods=['POST'])
def search_movie():
    try:
        data = request.json
        query = data.get('query', '')

        if not query:
            return jsonify({"error": "Query string cannot be empty."}), 400

        params = {"api_key": TMDB_API_KEY, "query": query}
        response = requests.get(TMDB_SEARCH_URL, params=params)

        if response.status_code == 200:
            results = response.json().get("results", [])
            movies = [
                {
                    "id": movie.get("id"),
                    "title": movie.get("title"),
                    "poster_url": f"https://image.tmdb.org/t/p/w500{movie.get('poster_path')}" if movie.get("poster_path") else None,
                } for movie in results
            ]
            return jsonify({"movies": movies})
        else:
            return jsonify({"error": "Failed to fetch search results."}), response.status_code
    except Exception as e:
        return jsonify({"error": "An unexpected error occurred.", "details": str(e)}), 500
    
#for showing the movie trailer
@app.route('/get_movie_trailer/<int:movie_id>')
def get_movie_trailer(movie_id):
    response = requests.get(f'https://api.themoviedb.org/3/movie/{movie_id}/videos?api_key={TMDB_API_KEY}')
    data = response.json()
    if 'results' in data and data['results']:
        trailer = next((video for video in data['results'] if video['type'] == 'Trailer'), None)
        if trailer:
            trailer_url = f'https://www.youtube.com/embed/{trailer["key"]}'
            return jsonify(trailer_url=trailer_url)
    return jsonify(error="Trailer not found"), 404

#for the movie details
@app.route('/get_movie_details', methods=['POST'])
def get_movie_details():
    """
    Endpoint to fetch detailed information about a movie by its ID.
    """
    try:
        data = request.json
        movie_ids = data.get('movie_ids', [])

        if not movie_ids or not isinstance(movie_ids, list):
            return jsonify({"error": "Invalid input. Please provide a list of movie IDs."}), 400

        movie_details = []

        for movie_id in movie_ids:
            url = f"{TMDB_BASE_URL}{movie_id}"
            params = {"api_key": TMDB_API_KEY}
            response = requests.get(url, params=params)

            if response.status_code == 200:
                movie_data = response.json()
                movie_details.append({
                    "id": movie_data.get("id"),
                    "title": movie_data.get("title"),
                    "overview": movie_data.get("overview"),
                    "release_date": movie_data.get("release_date"),
                    "vote_average": movie_data.get("vote_average"),
                    "poster_url": f"https://image.tmdb.org/t/p/w500{movie_data.get('poster_path')}" if movie_data.get("poster_path") else None,
                })
            else:
                movie_details.append({
                    "id": movie_id,
                    "error": f"Failed to fetch details for movie ID {movie_id}",
                })

        return jsonify({"movies": movie_details})

    except Exception as e:
        return jsonify({"error": "An unexpected error occurred.", "details": str(e)}), 500
    
# for the upcomming movies
@app.route('/upcoming_movies', methods=['GET'])
def upcoming_movies():
    try:
        params = {
            "api_key": TMDB_API_KEY,
            "language": "en-US",
            "region": "US",
            "page": 1
        }
        movies = []
        total_movies = 20
        movies_per_page = 20
        max_pages = (total_movies // movies_per_page) + (1 if total_movies % movies_per_page != 0 else 0)

        for page in range(1, max_pages + 1):
            params["page"] = page
            response = requests.get('https://api.themoviedb.org/3/movie/upcoming', params=params)
            if response.status_code == 200:
                results = response.json().get("results", [])
                movies.extend([
                    {
                        "id": movie.get("id"),
                        "title": movie.get("title"),
                        "poster_url": f"https://image.tmdb.org/t/p/w500{movie.get('poster_path')}" if movie.get("poster_path") else None,
                        "overview": movie.get("overview"),
                        "release_date": movie.get("release_date"),
                        "vote_average": movie.get("vote_average"),
                    } for movie in results
                ])
                if len(movies) >= total_movies or page >= response.json().get("total_pages", 1):
                    break
            else:
                return jsonify({"error": "Failed to fetch upcoming movies."}), response.status_code
        return jsonify({"movies": movies[:20]})
    except Exception as e:
        return jsonify({"error": "An unexpected error occurred.", "details": str(e)}), 500

#for the movie genres
@app.route('/genre_movie', methods=['GET'])
def search_movie_by_genre():
    try:
        genre_id = request.args.get('genre_id', type=int)
        page = request.args.get('page', 1, type=int)
        params = {
            "api_key": TMDB_API_KEY,
            "with_genres": genre_id,
            "page": page
        }
        response = requests.get(TMDB_GENRE_URL, params=params)

        if response.status_code == 200:
            results = response.json().get("results", [])
            movies = [
                {
                    "id": movie.get("id"),
                    "title": movie.get("title"),
                    "poster_url": f"https://image.tmdb.org/t/p/w500{movie.get('poster_path')}" if movie.get("poster_path") else None,
                } for movie in results
            ]
            return jsonify({"movies": movies, "page": page, "total_pages": response.json().get("total_pages", 1)})
        else:
            return jsonify({"error": "Failed to fetch search results."}), response.status_code
    except Exception as e:
        return jsonify({"error": "An unexpected error occurred.", "details": str(e)}), 500
    
#for bollywood movies
@app.route('/bollywood_movies', methods=['GET'])
def fetch_bollywood_movies():
    try:
        page = request.args.get('page', 1, type=int)
        params = {
            "api_key": TMDB_API_KEY,
            "language": "hi-IN",
            "region": "IN",
            "sort_by": "popularity.desc",
            "primary_release_year": 2018,
            "with_original_language": "hi",
            "page": page
        }
        response = requests.get(TMDB_HINDI_MOVIES_URL, params=params)

        if response.status_code == 200:
            results = response.json().get("results", [])
            movies = [
                {
                    "id": movie.get("id"),
                    "title": movie.get("title"),
                    "poster_url": f"https://image.tmdb.org/t/p/w500{movie.get('poster_path')}" if movie.get("poster_path") else None,
                } for movie in results
            ]
            return jsonify({"movies": movies, "page": page, "total_pages": response.json().get("total_pages", 1)})
        else:
            return jsonify({"error": "Failed to fetch Bollywood movies."}), response.status_code
    except Exception as e:
        return jsonify({"error": "An unexpected error occurred.", "details": str(e)}), 500
    
# pupular front movie
@app.route('/now_playing', methods=['GET'])
def now_playing():
    try:
        page = request.args.get('page', 1, type=int)
        params = {"api_key": TMDB_API_KEY, "language": "en-US", "page": page}
        response = requests.get('https://api.themoviedb.org/3/movie/now_playing', params=params)

        if response.status_code == 200:
            results = response.json().get("results", [])
            movies = [
                {
                    "id": movie.get("id"),
                    "title": movie.get("title"),
                    "poster_url": f"https://image.tmdb.org/t/p/w500{movie.get('poster_path')}" if movie.get("poster_path") else None,
                } for movie in results
            ]
            return jsonify({"movies": movies, "page": page, "total_pages": response.json().get("total_pages", 1)})
        else:
            return jsonify({"error": "Failed to fetch movies."}), response.status_code
    except Exception as e:
        return jsonify({"error": "An unexpected error occurred.", "details": str(e)}), 500
    except Exception as e:
        return jsonify({"error": "An unexpected error occurred.", "details": str(e)}), 500
#for signup
@app.route("/signup", methods=['POST','GET'])
def signup():
    if request.method=='POST':
        username = request.form['username']
        email = request.form['email']
        password = request.form['password']

        new_signup = Signup(username=username, email=email, password=password)
        db.session.add(new_signup)
        db.session.commit()
        flash('Sign Up Successful', 'success')
        return redirect(url_for('home'))

#for signin page
@app.route('/signin', methods=['POST', 'GET'])
def signin():
    if request.method == 'POST':
        username = request.form['signinUsername']
        password = request.form['signinPassword']
        new_signup = Signin(username=username,password=password)
        db.session.add(new_signup)
        db.session.commit()
        flash('Sign In Successful', 'success')
        return redirect(url_for('home'))
    
#for the intellient search engine
@app.route('/autocomplete', methods=['GET'])
def autocomplete():
    try:
        query = request.args.get('query', '').lower()
        if not query:
            return jsonify({"suggestions": []})
        movie_titles = movies_df['title'].tolist()
        matches = process.extract(query, movie_titles, limit=5)
        suggestions = [match[0] for match in matches]
        return jsonify({"suggestions": suggestions})
    except Exception as e:
        return jsonify({"error": "An unexpected error occurred.", "details": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
