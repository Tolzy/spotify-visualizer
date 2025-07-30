// This is a debugging version of the serverless function.
// It will return more information to help us diagnose the issue.

export const config = {
    runtime: 'edge'
};

export default async function handler(request) {
    try {
        // Get new access token
        const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${btoa(
                    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
                )}`
            },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: process.env.SPOTIFY_REFRESH_TOKEN
            })
        });
        
        // Check if getting the token failed
        if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text();
            throw new Error(`Spotify token error: ${errorText}`);
        }

        const { access_token } = await tokenResponse.json();

        // Get current song
        const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
            headers: {
                Authorization: `Bearer ${access_token}`
            }
        });

        // If nothing is playing, Spotify returns a 204 No Content
        if (response.status === 204) {
            return new Response(JSON.stringify({ 
                isPlaying: false, 
                debug_info: "Spotify returned 204 No Content." 
            }), {
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }

        const data = await response.json();

        // Return everything Spotify gives us for debugging
        return new Response(JSON.stringify({
            isPlaying: data.is_playing,
            title: data.item?.name || null,
            artist: data.item?.artists.map((_artist) => _artist.name).join(', ') || null,
            full_spotify_response: data // This is the new debugging field
        }), {
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    } catch (error) {
        // Return a more descriptive error
        return new Response(JSON.stringify({ 
            error: 'Error fetching song',
            message: error.message 
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
}
