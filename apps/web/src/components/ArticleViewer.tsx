import { FC, useState, useEffect } from 'react';
import { trpc } from '@web/utils/trpc';
import { Spinner, Progress } from '@nextui-org/react';

interface ArticleViewerProps {
  articleId: string;
}

const ArticleViewer: FC<ArticleViewerProps> = ({ articleId }) => {
  const { data: articleContent, isLoading } = trpc.article.content.useQuery({ id: articleId });
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [currentWordIndex, setCurrentWordIndex] = useState<number>(0);
  const [utterance, setUtterance] = useState<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    return () => {
      speechSynthesis.cancel();
      setIsSpeaking(false);
    };
  }, [articleId]);

  if (isLoading) {
    return <Spinner />;
  }

  if (!articleContent) {
    return <div>Article not found</div>;
  }

  const extractTextFromHtml = (htmlString: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    return doc.body.textContent || '';
  };

  const toggleSpeech = () => {
    if (isSpeaking && !isPaused) {
      speechSynthesis.pause();
      setIsPaused(true);
    } else if (isSpeaking && isPaused) {
      speechSynthesis.resume();
      setIsPaused(false);
    } else {
      if (articleContent) {
        const textToSpeak = extractTextFromHtml(articleContent);
        const newUtterance = new SpeechSynthesisUtterance(textToSpeak);
        newUtterance.onboundary = (event) => {
          // Basic word highlighting logic (can be improved)
          const words = textToSpeak.substring(0, event.charIndex).split(/\s+/);
          setCurrentWordIndex(words.length - 1);
        };
        newUtterance.onend = () => {
          setIsSpeaking(false);
          setIsPaused(false);
          setCurrentWordIndex(0);
          setUtterance(null);
        };
        setUtterance(newUtterance);
        speechSynthesis.speak(newUtterance);
        setIsSpeaking(true);
        setIsPaused(false);
      }
    }
  };

  const handleSkip = (direction: 'forward' | 'backward') => {
    if (utterance && articleContent) {
      speechSynthesis.cancel(); // Stop current speech
      const words = extractTextFromHtml(articleContent).split(/\s+/);
      const numWordsToSkip = 10; // Arbitrary number of words to skip

      let newWordIndex;
      if (direction === 'forward') {
        newWordIndex = Math.min(currentWordIndex + numWordsToSkip, words.length - 1);
      } else {
        newWordIndex = Math.max(currentWordIndex - numWordsToSkip, 0);
      }

      const newText = words.slice(newWordIndex).join(' ');
      const newUtterance = new SpeechSynthesisUtterance(newText);

      // Re-apply event listeners
      newUtterance.onboundary = (event) => {
        const currentWords = newText.substring(0, event.charIndex).split(/\s+/);
        setCurrentWordIndex(newWordIndex + currentWords.length -1);
      };
      newUtterance.onend = () => {
        setIsSpeaking(false);
        setIsPaused(false);
        setCurrentWordIndex(0);
        setUtterance(null);
      };

      setUtterance(newUtterance);
      speechSynthesis.speak(newUtterance);
      setCurrentWordIndex(newWordIndex);
      setIsSpeaking(true);
      setIsPaused(false);
    }
  };

  return (
    <div>
      <button onClick={toggleSpeech}>
        {isSpeaking && !isPaused ? 'Pause' : isPaused ? 'Resume' : 'Play'}
      </button>
      <button onClick={() => handleSkip('backward')}>Skip Backward</button>
      <button onClick={() => handleSkip('forward')}>Skip Forward</button>
      {articleContent && (
        <Progress
          aria-label="Playback progress"
          value={(currentWordIndex / extractTextFromHtml(articleContent).split(/\s+/).length) * 100}
          onChange={(newValue) => {
            if (utterance && articleContent) {
              speechSynthesis.cancel();
              const words = extractTextFromHtml(articleContent).split(/\s+/);
              const newWordIndex = Math.floor((newValue / 100) * words.length);
              const newText = words.slice(newWordIndex).join(' ');
              const newUtterance = new SpeechSynthesisUtterance(newText);

              newUtterance.onboundary = (event) => {
                const currentWords = newText.substring(0, event.charIndex).split(/\s+/);
                setCurrentWordIndex(newWordIndex + currentWords.length -1);
              };
              newUtterance.onend = () => {
                setIsSpeaking(false);
                setIsPaused(false);
                setCurrentWordIndex(0);
                setUtterance(null);
              };

              setUtterance(newUtterance);
              speechSynthesis.speak(newUtterance);
              setCurrentWordIndex(newWordIndex);
              setIsSpeaking(true);
              setIsPaused(false);
            }
          }}
          className="w-full"
        />
      )}
      <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: articleContent }} />
    </div>
  );
};

export default ArticleViewer;
