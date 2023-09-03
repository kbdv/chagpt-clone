import {useState, useEffect, useRef} from 'react'
import ReactMarkdown from 'react-markdown';


export default function App() {

    const [userPrompt, setUserPrompt] = useState(null)
    const [aiReply, setAiReply] = useState(null)
    const [previousChats, setPreviousChats] = useState([])
    const [currentTitle, setCurrentTitle] = useState(null)
    const [isChatMessageDisplayed, setIsChatMessageDisplayed] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isBusy, setIsBusy] = useState(false);
    const feedRef = useRef(null)
    const inputRef = useRef(null);

    /************************************************************/

    /*
    This function will trigger only if there's been a change to the userPrompt of the variable 'aiReply' or 'currentTitle'.
    If the 'currentTitle' is null, that means it's the 1st prompt in this conversation and 'currentTitle' is set to 'userPrompt'.
    Otherwise, it's not the first prompt and we update the 'previousChats' array with the 'userPrompt' and the 'aiReply'
    while keeping track of the 'currentTitle' associated with the conversation.
    */
    useEffect(() => {
        // console.log(currentTitle, userPrompt, aiReply);
        if (!currentTitle && userPrompt && aiReply) {
            setCurrentTitle(userPrompt)
        }
        if (currentTitle && userPrompt && aiReply) {
            setPreviousChats(prevChats => (
                [...prevChats, {
                    title: currentTitle,       // because of the previous if, 'title' should be the 1st prompt
                    role: 'user',
                    content: userPrompt          // 'userPrompt' will be whatever the user asked from chatGPT
                }, {
                    title: currentTitle,
                    role: aiReply.role,     // 'aiReply.role' should be the role specified by chatGpt, it should be 'assistant'
                    content: aiReply.content   // 'aiReply.content' should be the content returned by chatGPT in response to our prompt
                }]
            ))
        }
        setIsChatMessageDisplayed(true);
    }, [aiReply, currentTitle])

    // This function allows us to reset the input box to blank after its 'userPrompt' has been used
    useEffect(() => {
        if (isChatMessageDisplayed) {
            setUserPrompt("");       // reset the input box
            setIsChatMessageDisplayed(false); // Reset the flag
        }
    }, [isChatMessageDisplayed]);


    /***********************************************************************/

    /* This filters the 'previousChats' array so that we can retrieve all the entries that have a 'title' matching 'currentTitle'
    the results are then stored within a new array called 'currentChat' */
    const currentChat = previousChats.filter(previousChats => previousChats.title === currentTitle)
    // This filters the previousChats to extract the unique 'title' values (by storing them into a Set)
    const uniqueTitles = Array.from(new Set(previousChats.map(prevChat => prevChat.title)))

    /***********************************************************************/
    // This function creates an ellipsis animation (further defined in the CSS)
    const BouncingDotsLoader = () => {
        return (
            <div className="bouncing-loader">
                <div></div>
                <div></div>
                <div></div>
            </div>
        );
    };

    // Use useEffect to focus the input element when isLoading changes to false
    useEffect(() => {
        if (!isLoading) {
            inputRef.current.focus();
        }
    }, [isLoading]);

    // This function makes sure the feed will always snap to the bottom when new entries are added or when we switch conversations.
    useEffect(() => {
        const feedContainer = feedRef.current;
        if (feedContainer) {
            feedContainer.scrollTop = feedContainer.scrollHeight;
        }
    }, [currentChat, currentTitle]);

    // This enables us to switch to a previous conversation by clicking on the history
    const switchConvo = (uniqueTitle) => {
        setCurrentTitle(uniqueTitle)
        setAiReply(null)
        setUserPrompt("")
        setIsBusy(false)
        // console.log(currentChat)
    }
    // This starts a new conversation and clears the feed
    const createNewChat = () => {
        setAiReply(null)        // resetting the variables we use to keep track of conversations
        setUserPrompt("")
        setIsBusy(false)
        setCurrentTitle(null)
    }
    // This sends the user prompt to the AI and retrieves the reply
    const getMessages = async () => {
        setIsLoading(true)
        // We want to send the full conversation each time so that the AI can remember the chat and make proper responses.
        const fullPrompt = [...currentChat, userPrompt]
        // The array of messages must be converted into a single String before it is sent to the API.
        const serializedPrompt = fullPrompt.map(entry => JSON.stringify(entry)).join('\n');

        // console.log(fullPrompt)
        const options = {
            method: "POST",
            body: JSON.stringify({
                message: serializedPrompt
            }),
            headers: {
                'Content-Type': "application/json"
            }
        }

        try {
            // communicating to the backend server hosted on Vercel
            const response = await fetch('path_to_backend_server/api/completions', options)
            const data = await response.json()
            setAiReply(data.choices[0].message)
            setIsBusy(false)
        } catch (error) {
            setIsBusy(true)
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }
    // Triggering the getMessages() function when the user presses the 'Enter' key
    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            getMessages();
        }
    };



    /***********************************************************************/

    return (
        <div className="app">

            <section className='side-bar'>
                <button onClick={createNewChat}><b>+</b> New chat</button>
                <ul className='history'>
                    {uniqueTitles?.map((uniqueTitle, index) => <li key={index}
                                                                   onClick={() => switchConvo(uniqueTitle)}>{uniqueTitle}</li>
                    )}
                </ul>
                <nav>
                </nav>
            </section>

            <section className='main'>
                {!currentTitle &&
                    <div>
                        <p className='disclaimer'><br></br>A functional clone of OpenAI's chat bot.
                            <br></br>
                            <br></br>
                            (Made with React and Node.js)</p>
                    </div>}
                <ul className='feed' ref={feedRef}>
                    {/*  The following code means :
                    if the array 'currentChat' is not null (indicated by the '?'),
                    loop through the contents of that array (indicated by '.map')
                    and create a new entry in the unordered list displaying the userPrompt 'role' and the userPrompt 'content' of that entry */}
                    {currentChat?.map((chatMessage, index) =>
                        <li key={index} className='bubble'>
                            <p className='role'>{chatMessage.role + ":"}</p>
                            {/* The answer we get from chatGPT API makes use of Markdown.
                            To make sure React displays the markdown properly, we have to import React-markdown */}
                            <br />
                            <ReactMarkdown className='content' children={chatMessage.content}/>
                            {/*<p className='content' children={chatMessage.content} />*/}
                        </li>)}

                    {/* Render the ellipsis when isLoading is true */}
                    {isLoading && <li><BouncingDotsLoader/></li>}

                    {/* The following code displays a custom error message in the feed whenever there's an error retrieving the API response (usually a 504 Gateway timeout) */}
                    {isBusy && !isLoading &&
                        <li>
                            <p className='alert'>Server is busy. Could not display message.</p>
                        </li>}

                </ul>
                <div className='bottom'>
                    <div className='userInput'>
                        <input
                            ref={inputRef}
                            placeholder='Send a message'
                            value={userPrompt}
                            onChange={(e) => setUserPrompt(e.target.value)}
                            onKeyPress={handleKeyPress}
                            disabled={isLoading}
                        />
                        <div id="submit" onClick={getMessages}>
                            <svg viewBox="0 0 512 512" className="sendIcon">
                                <g id="XMLID_2_">
                                    <polygon
                                        id="XMLID_4_"
                                        points="0,0 49.6,233.9 352.1,256 49.6,278.1 0,512 512,256"
                                    />
                                </g>
                            </svg>

                        </div>
                    </div>
                    <p className='info'>
                        Free Research Preview. ChatGPT may produce inaccurate information about people, places, or
                        facts.
                    </p>
                </div>
            </section>
        </div>
    )
}

