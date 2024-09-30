function getTrends() {
    let apiFetched = false;
    const trendingTopicsDiv = document.querySelector('.trending-topics');
    if (!trendingTopicsDiv) {
        console.warn('Trending Topics div not found');
        setTimeout(getTrends, 1000);
        return;
    }

    const lang = navigator.language.startsWith('pt') ? 'pt' : 'en';
    const apiUrl = `https://bsky-trends.deno.dev/trend?lang=${lang}`;

    const translations = {
        categories: {
            science: { en: 'Science', pt: 'Ciência' },
            music: { en: 'Music', pt: 'Música' },
            politics: { en: 'Politics', pt: 'Política' },
            entertainment: { en: 'Entertainment', pt: 'Entretenimento' },
            sports: { en: 'Sports', pt: 'Esportes' },
            technology: { en: 'Technology', pt: 'Tecnologia' },
            health: { en: 'Health', pt: 'Saúde' },
            none: { en: '', pt: '' },
            lgbt: { en: 'LGBT', pt: 'LGBT' },
            economy: { en: 'Economy', pt: 'Economia' },
            education: { en: 'Education', pt: 'Educação' },
            environment: { en: 'Environment', pt: 'Meio Ambiente' },
            food: { en: 'Food', pt: 'Comida' },
            lifestyle: { en: 'Lifestyle', pt: 'Estilo de Vida' },
            religion: { en: 'Religion', pt: 'Religião' },
            social: { en: 'Social', pt: 'Social' },
            travel: { en: 'Travel', pt: 'Viagem' }
        },
        posts: {
            en: 'posts',
            pt: 'posts'
        },
        k: {
            en: 'k',
            pt: 'mil'
        },
        million: {
            en: 'mi',
            pt: 'mi'
        },
        showMore: {
            en: 'Show more',
            pt: 'Mostrar mais'
        },
        trendingTopics: {
            en: 'Trending Topics',
            pt: 'Tópicos em Alta'
        }
    };

    function requestSavedTrends(pluginSlug, data) {
        // Send a message to the WebView to fetch the trends
        window.ReactNativeWebView.postMessage(JSON.stringify({
            messageType: 'FETCH_DATA',
            name: `${pluginSlug}-trends`,
            data: data,
        }));
    }

    function saveTrends(pluginSlug, data) {
        // Send a message to the WebView to save the trends
        window.ReactNativeWebView.postMessage(JSON.stringify({
            messageType: 'SAVE_DATA',
            name: `${pluginSlug}-trends`,
            data: data,
            time: Date.now(),
        }));
    }

    function fetchTrendsApi(pluginSlug) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
            messageType: 'FETCH_API',
            name: `${pluginSlug}-fetch-trends`,
            url: apiUrl,
        }));
    }

    function organizeTrends(trends) {
        const weights = {
            hashtags: 1.3,
            words: 1.2,
            phrases: 1.1,
            globalWords: 1.0
        };

        return trends.sort((a, b) => {
            const weightA = weights[a.type] || 1;
            const weightB = weights[b.type] || 1;
            const scoreA = a.count * weightA;
            const scoreB = b.count * weightB;
            return scoreB - scoreA;
        });
    }

    try {
        let trends = [];
        let timeSavedTrends = 0;
        let displayedTrends = 6;
        let totalTrends = 0;

        window.receiveData = function(name, content) {
            if (!content || Object.keys(content).length === 0) {
                if(name === 'nightsky-plugin-default-trends') {
                    console.warn('No content found for trends in storage');
                    if (!apiFetched) {
                        fetchTrendsApi('nightsky-plugin-default');
                        apiFetched = true;
                    }
                }
                return;
            }
            try {
                const parsedContent = typeof content === 'string' ? JSON.parse(content) : content;
                if(name === 'nightsky-plugin-default-trends') {
                    timeSavedTrends = parsedContent.time;
                    if (Date.now() - timeSavedTrends > 600000 && !apiFetched) {
                        console.log('Fetching trends from API');
                        fetchTrendsApi('nightsky-plugin-default');
                        apiFetched = true;
                        return;
                    }
                    if(parsedContent.trends && parsedContent.trends[lang]) {
                        const langTrends = parsedContent.trends[lang];
                        const savedTrends = [
                            ...(langTrends.words || []).map(trend => ({ ...trend, type: 'words' })),
                            ...(langTrends.phrases || []).map(trend => ({ ...trend, type: 'phrases' })),
                            ...(langTrends.hashtags || []).map(trend => ({ ...trend, type: 'hashtags' })),
                            ...(langTrends.globalWords || []).map(trend => ({ ...trend, type: 'globalWords' }))
                        ];
                        trends = organizeTrends(savedTrends);
                        console.log('Trends fetched from storage:', trends);
                        totalTrends = trends.length;
                        displayTrends();
                    }
                }
                if(name === 'nightsky-plugin-default-fetch-trends') {
                    if(parsedContent.trends && parsedContent.trends[lang]) {
                        const langTrends = parsedContent.trends[lang];
                        const trendsFetched = [
                            ...(langTrends.words || []).map(trend => ({ ...trend, type: 'words' })),
                            ...(langTrends.phrases || []).map(trend => ({ ...trend, type: 'phrases' })),
                            ...(langTrends.hashtags || []).map(trend => ({ ...trend, type: 'hashtags' })),
                            ...(langTrends.globalWords || []).map(trend => ({ ...trend, type: 'globalWords' }))
                        ];
                        trends = organizeTrends(trendsFetched);
                        saveTrends('nightsky-plugin-default', trends);
                        totalTrends = trends.length;
                        displayTrends();
                    }
                }
            } catch (error) {
                console.error('Error parsing content:', error);
            }
        }

        requestSavedTrends('nightsky-plugin-default', 'trending-topics');

        function createTrendElement(trend, index) {
            trendingTopicsDiv.innerHTML = `<h2>${translations.trendingTopics[lang]}</h2>`;
            const trendElement = document.createElement('li');
            const trendRank = document.createElement('span');
            const trendName = document.createElement('span');
            const trendPosts = document.createElement('span');
    
            trendRank.className = 'trend-rank';
            trendName.className = 'trend-name';
            trendPosts.className = 'trend-posts';
    
            const categoryTranslation = translations.categories[trend.category][lang];
            trendRank.textContent = `${index + 1} ${categoryTranslation !== '' ? ` - ${categoryTranslation}` : ''}`;
            trendName.textContent = trend.topic;
            const unit = trend.count >= 1000000 ? translations.million[lang] : trend.count >= 1000 ? translations.k[lang] : '';
            const formattedCount = trend.count >= 1000000 
                ? (trend.count / 1000000).toFixed(1).replace('.', ',') 
                : trend.count >= 1000 
                ? (trend.count / 1000).toFixed(1).replace('.', ',') 
                : trend.count;
            trendPosts.textContent = `${formattedCount} ${unit} ${translations.posts[lang]}`;
    
            trendElement.appendChild(trendRank);
            trendElement.appendChild(trendName);
            trendElement.appendChild(trendPosts);
    
            const searchUrl = `https://bsky.app/search?q=${encodeURIComponent(trend.topic)}`;
            trendElement.addEventListener('click', () => {
                window.location.href = searchUrl;
            });
    
            return trendElement;
        }
        
        function displayTrends() {
            try {
                if (!trends || trends.length === 0) {
                    return;
                }
                const ul = document.createElement('ul');
                for (let i = 0; i < displayedTrends && i < totalTrends; i++) {
                    ul.appendChild(createTrendElement(trends[i], i));
                }
                if (!translations || !translations.trendingTopics || !translations.trendingTopics[lang]) {
                    throw new Error('Translation not available');
                }
                trendingTopicsDiv.innerHTML = `<h2>${translations.trendingTopics[lang]}</h2>`;
                trendingTopicsDiv.appendChild(ul);
        
                if (displayedTrends < totalTrends) {
                    const showMoreButton = document.createElement('button');
                    if (!translations.showMore || !translations.showMore[lang]) {
                        throw new Error('Translation not available');
                    }
                    showMoreButton.textContent = translations.showMore[lang];
                    showMoreButton.addEventListener('click', () => {
                        displayedTrends += 6;
                        displayTrends();
                    });
                    trendingTopicsDiv.appendChild(showMoreButton);
                }
            } catch (error) {
                console.error('Error displaying trends:', error);
            }
        }

    } catch (error) {
        console.error('Error fetching trends:', error);
    }
};

console.log('Trending topics script loaded');   
var removedFeeds = false;
function addTrendingTopics() {
    const trendingTopicsAlreadyAdded = document.querySelector('.trending-topics');
    if (trendingTopicsAlreadyAdded) {
        return;
    }

    let suggestedUsersDiv = document.querySelector('div.r-1d5kdc7:nth-child(2) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(3) > div:nth-child(1) > div:nth-child(2)');
    if(!suggestedUsersDiv) {
        suggestedUsersDiv = document.querySelector('.r-sa2ff0');  
    }

    if (!suggestedUsersDiv) {
        if(!suggestedUsersDiv) {
            console.error('Suggested Users div not found');
        }
        return;
    }

    console.log('Adding trending topics');
    // Keep all divs up to the div that contains the button and remove the subsequent ones
    let keep = true;
    console.log(suggestedUsersDiv.children.length);
    if(!removedFeeds && suggestedUsersDiv.children.length >= 21) {
        Array.from(suggestedUsersDiv.children).forEach((child) => {
            if (!keep) { // Remove all subsequent divs
                suggestedUsersDiv.removeChild(child);
                return;
            }

            // Check if there is a single div with a single button inside
            const button = child.childElementCount === 1 && child.children[0].childElementCount === 1 && child.children[0].children[0].tagName === 'BUTTON';

            if (button) {
                keep = false;
            }
        });
        removedFeeds = true;
    } else {
        setTimeout(() => {
            addTrendingTopics();
        }, 1000);
        return;
    }

    function callGetTrends() {
        console.log('removedFeeds: ', removedFeeds);
        if(!removedFeeds)return;
        try {
            if(!document.querySelector('.trending-topics')) {
                const trendingDiv = document.createElement('div');
                trendingDiv.classList.add('trending-topics', 'css-175oi2r');
                suggestedUsersDiv.insertBefore(trendingDiv, suggestedUsersDiv.firstChild);
            }
            getTrends();
        } catch (error) {
            console.warn('Error calling getTrends', error);
        }
    }

    callGetTrends();
}

(function() {
    if(!window.addTrendingTopics){
        removedFeeds = false;
        window.addTrendingTopics = addTrendingTopics;
    }
})();

function isSearchUrl() {
    return window.location.pathname === '/search';
}

var called = false;
var observer;
var initialLoad = true;

function onUrlChange() {
    const body = document.querySelector("body");

    if (observer) {
        observer.disconnect();
    }

    observer = new MutationObserver(() => {
        if (isSearchUrl()) {
            if (!document.querySelector('.trending-topics') && !called) {
                console.log('Adding trending topics on URL change');
                window.addTrendingTopics();
                called = true;
            }
        } else {
            const trendingTopics = document.querySelector('.trending-topics');
            if (trendingTopics) {
                trendingTopics.remove();
                called = false;
            }
        }
    });

    observer.observe(body, { childList: true, subtree: true });

    window.addEventListener('popstate', () => {
        called = false;
        onUrlChange();
    });

    if (initialLoad) {
        initialLoad = false;
        if (isSearchUrl()) {
            window.addTrendingTopics();
            called = true;
        }
    }
}

onUrlChange();
