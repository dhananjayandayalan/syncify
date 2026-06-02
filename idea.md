# Syncify

Okay, let's work on the project. I just want to create an application to synchronize the music playlist across streaming platforms like Spotify, Apple Music, Amazon Music, Youtube Music etc. But there's a catch. We already have playlist transformation application from one streaming platform to another.

The idea of Syncify is to synchronize the playlist with all the linked streaming platforms when playlist of one streaming platform got updated. For example, if we add/delete a song in spotify, it has to update youtube music, apple music and amazon music playlist if these streaming platform accounts  
 are linked to the user.

There's another requirement called playlist management - we can link certain playlist to certain platforms. For example, one playlist got linked with all the streaming platform and one playlist linked only with spotify and apple music. And another playlist got linked with only youtube music and apple  
 music.

There must be a dashboard where user can create playlist from there, manage the playlist, link unlink streaming platforms from the playlist, delete the playlist in one place so that we ca delete all over the streaming platforms which is linked with the playlist or we can specify in which platform the  
 playlist has to be deleted.

For playlist creation in syncify, we had to create a universal search to search the songs from spotify by implementing the same search algorithm used by spotify to find the songs in search bar and add them. Some edge case needs to be addressed, for example in youtube music the song has both music  
 video and official audio release from artist. Either it has to fetch the artist or just need to skip adding those songs in the particular streaming platform. Mostly all songs will be available in all platforms. Youtube music is exception. But same can be applicable to all other platforms, if it  
 doesn't contains a particular song in spotify, it can skip. But we need to have a stylized log platform for a particular playlist with categorizing the platform with tabs stating which platform doesn't have which song.

And the search has to be regional specific, some songs won't be available in some regions.

claude --resume 194b322a-06e2-4625-ac6e-d2b30ecfacc8