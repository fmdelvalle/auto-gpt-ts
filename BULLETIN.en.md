# Important
This is a port of Python AutoGPT project. The original has bigger plugin and command sets.
You can find it at https://github.com/Significant-Gravitas/Auto-GPT

# Why
I started this project because I couldn't make the original work. The DuckDuckGo API was broken,
I was getting empty responses everywhere, etc. Also, I wanted to learn the architecture of the 
project, and it turns out that piece by piece migration helped me with that. It was also risky,
as the AI libraries for Typescript are not so abundant as in Python, so I had to choose new ones, 
and in some cases implement some parts (parts of Numpy, the sentencizer, etc.).

# Python AutoGPT Website and Documentation Site 📰📖
Check out *https://agpt.co*, the official news & updates site for Auto-GPT!
The documentation also has a place here, at *https://docs.agpt.co*
AutoGPT-TS has no official website yet, only the GitHub page.

# For contributors 👷🏼
AutoGPT-TS took the plugin structure from AutoGPT, but the interface is likely to change.
Also, we may be improving some parts of the application. The first step was to convert core
functionality to Typescript, now I'll fixing the architecture a bit to make it more extensible
and maintanable.
I'd appreciate suggestions, testing, bugfixes. You can create issues in GitHub for that.

# 🚀 v0.0.1 Release 🚀
This is the first release, with just the core functions and maybe too much logging.

## Missing features 🐋
 * More commands, plugins interface
 * More memory backends, if needed
 * TTS, and voice to text
 * Full .env support
 * More unit tests

## Extra features 🐋
 * It is async, so it is possible to have multiple runners in the same thread
 * Faster sentencizer
 * Internationalization in progress. Language is set in a per-agent basis.
