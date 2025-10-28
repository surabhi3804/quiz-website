// Quiz Variables
let allQuestions = [];
let quizData = [];
let currentQuestion = 0;
let score = 0;
let selectedAnswer = null;
let timer = null;
let timeLeft = 15;
let autoProgressTimeout = null;

// DOM Elements
const startScreen = document.getElementById('start-screen');
const quizScreen = document.getElementById('quiz-screen');
const resultScreen = document.getElementById('result-screen');
const startBtn = document.getElementById('start-btn');
const nextBtn = document.getElementById('next-btn');
const restartBtn = document.getElementById('restart-btn');
const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const currentQuestionSpan = document.getElementById('current-question');
const totalQuestionsSpan = document.getElementById('total-questions');
const scoreSpan = document.getElementById('score');
const progressBar = document.getElementById('progress');
const finalScoreSpan = document.getElementById('final-score');
const percentageSpan = document.getElementById('percentage');
const resultMessage = document.getElementById('result-message');
const timerText = document.getElementById('timer-text');
const timerCircle = document.getElementById('timer-circle');

// Event Listeners
startBtn.addEventListener('click', startQuiz);
nextBtn.addEventListener('click', nextQuestion);
restartBtn.addEventListener('click', restartQuiz);

// Normalize question data to handle both formats
function normalizeQuestion(q, index) {
    // If question has 'answer' instead of 'correct', find the correct index
    if (q.answer !== undefined && q.correct === undefined) {
        const correctIndex = q.options.findIndex(opt => opt === q.answer);
        return {
            id: q.id || index + 1,
            question: q.question,
            options: q.options,
            correct: correctIndex !== -1 ? correctIndex : 0,
            category: q.category || "General Knowledge"
        };
    }
    
    // Return as-is if it already has the correct format
    return {
        id: q.id || index + 1,
        question: q.question,
        options: q.options,
        correct: q.correct,
        category: q.category || "General Knowledge"
    };
}

// Load questions from JSON file
function loadQuestionsFromJSON() {
    fetch('questions.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Validate JSON structure
            if (!data || !data.questions || !Array.isArray(data.questions)) {
                throw new Error('Invalid JSON format: questions array not found');
            }
            
            if (data.questions.length === 0) {
                throw new Error('No questions found in JSON file');
            }
            
            // Normalize all questions to handle mixed formats
            allQuestions = data.questions
                .filter(q => q.question && q.options && q.options.length >= 2)
                .map((q, idx) => normalizeQuestion(q, idx));
            
            console.log('✅ Questions loaded successfully!', allQuestions.length, 'questions found');
            startBtn.disabled = false;
            startBtn.textContent = 'Start Quiz';
        })
        .catch(error => {
            console.error('❌ Error loading questions:', error);
            startBtn.textContent = 'Error Loading Questions';
            startBtn.disabled = true;
            alert('Error: Could not load questions.json file.\n\nPlease ensure:\n1. questions.json is in the same folder as index.html\n2. You are running this on a web server (not file://)\n3. JSON file is properly formatted\n\nTry using: python -m http.server or VS Code Live Server');
        });
}

// Shuffle array function (Fisher-Yates algorithm)
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function startQuiz() {
    if (!allQuestions || allQuestions.length === 0) {
        alert('No questions available. Please refresh the page and try again.');
        return;
    }
    
    // Clear any existing timers
    clearAllTimers();
    
    // Shuffle all questions and select only 10 random questions
    const shuffledQuestions = shuffleArray(allQuestions);
    quizData = shuffledQuestions.slice(0, Math.min(10, shuffledQuestions.length));
    
    console.log('🎮 Quiz started with', quizData.length, 'questions');
    
    currentQuestion = 0;
    score = 0;
    selectedAnswer = null;
    scoreSpan.textContent = score;
    currentQuestionSpan.textContent = 1;
    totalQuestionsSpan.textContent = quizData.length;
    progressBar.style.width = '0%';
    
    startScreen.classList.remove('active');
    quizScreen.classList.add('active');
    loadQuestion();
}

function loadQuestion() {
    if (!quizData || quizData.length === 0) {
        console.error('❌ No quiz data available');
        return;
    }

    if (!quizData[currentQuestion]) {
        console.error('❌ No question data available at index', currentQuestion);
        return;
    }

    const question = quizData[currentQuestion];
    console.log('📝 Loading question:', currentQuestion + 1, '-', question.question);
    
    questionText.textContent = question.question;
    optionsContainer.innerHTML = '';
    selectedAnswer = null;
    nextBtn.style.display = 'none';

    // Reset and start timer
    startTimer();

    // Verify options exist
    if (!question.options || !Array.isArray(question.options) || question.options.length === 0) {
        console.error('❌ No options found for question');
        optionsContainer.innerHTML = '<p style="color: red;">Error: No options available for this question</p>';
        return;
    }

    // Verify correct answer exists
    if (question.correct === undefined || question.correct === null) {
        console.error('❌ No correct answer defined for question');
        return;
    }

    // Shuffle options for each question
    const shuffledOptions = question.options.map((option, index) => ({
        text: option,
        originalIndex: index
    }));
    
    // Fisher-Yates shuffle for options
    for (let i = shuffledOptions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledOptions[i], shuffledOptions[j]] = [shuffledOptions[j], shuffledOptions[i]];
    }

    console.log('✅ Creating', shuffledOptions.length, 'options');

    shuffledOptions.forEach((option, idx) => {
        const optionDiv = document.createElement('div');
        optionDiv.classList.add('option');
        optionDiv.textContent = option.text;
        optionDiv.dataset.originalIndex = option.originalIndex;
        optionDiv.addEventListener('click', () => selectAnswer(option.originalIndex, optionDiv));
        optionsContainer.appendChild(optionDiv);
        console.log('➕ Added option', idx + 1, ':', option.text);
    });

    console.log('✅ Options rendered. Total in container:', optionsContainer.children.length);
    updateProgress();
}

function selectAnswer(originalIndex, optionDiv) {
    if (selectedAnswer !== null) return;

    // Clear timer first
    clearAllTimers();
    
    selectedAnswer = originalIndex;
    const question = quizData[currentQuestion];
    const allOptions = document.querySelectorAll('.option');

    allOptions.forEach(opt => {
        opt.classList.add('disabled');
        opt.style.pointerEvents = 'none';
    });

    if (originalIndex === question.correct) {
        optionDiv.classList.add('correct');
        score++;
        scoreSpan.textContent = score;
    } else {
        optionDiv.classList.add('wrong');
        allOptions.forEach(opt => {
            if (parseInt(opt.dataset.originalIndex) === question.correct) {
                opt.classList.add('correct');
            }
        });
    }

    nextBtn.style.display = 'block';
    
    // Auto-progress after 2 seconds when user selects an answer
    autoProgressTimeout = setTimeout(() => {
        nextQuestion();
    }, 2000);
}

function nextQuestion() {
    // Clear any auto-progress timeout
    if (autoProgressTimeout) {
        clearTimeout(autoProgressTimeout);
        autoProgressTimeout = null;
    }
    
    currentQuestion++;

    if (currentQuestion < quizData.length) {
        currentQuestionSpan.textContent = currentQuestion + 1;
        loadQuestion();
    } else {
        showResults();
    }
}

function startTimer() {
    // Clear any existing timers
    clearAllTimers();
    
    timeLeft = 15;
    timerText.textContent = timeLeft;
    
    // Reset timer circle
    if (timerCircle) {
        timerCircle.style.strokeDashoffset = '0';
        timerCircle.classList.remove('warning', 'danger');
    }
    
    timer = setInterval(() => {
        timeLeft--;
        timerText.textContent = timeLeft;
        
        // Update timer circle
        if (timerCircle) {
            const offset = 283 - (283 * timeLeft) / 15;
            timerCircle.style.strokeDashoffset = offset;
            
            if (timeLeft <= 5) {
                timerCircle.classList.add('danger');
                timerCircle.classList.remove('warning');
            } else if (timeLeft <= 10) {
                timerCircle.classList.add('warning');
                timerCircle.classList.remove('danger');
            }
        }
        
        if (timeLeft <= 0) {
            clearInterval(timer);
            timer = null;
            handleTimeUp();
        }
    }, 1000);
}

function handleTimeUp() {
    if (selectedAnswer !== null) return;
    
    selectedAnswer = -1;
    const question = quizData[currentQuestion];
    const allOptions = document.querySelectorAll('.option');
    
    allOptions.forEach(opt => {
        opt.classList.add('disabled');
        opt.style.pointerEvents = 'none';
        if (parseInt(opt.dataset.originalIndex) === question.correct) {
            opt.classList.add('correct');
        }
    });
    
    // Show next button briefly (optional, can be removed)
    nextBtn.style.display = 'block';
    
    // Automatically move to next question after 2 seconds
    autoProgressTimeout = setTimeout(() => {
        nextQuestion();
    }, 2000);
}

function clearAllTimers() {
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
    if (autoProgressTimeout) {
        clearTimeout(autoProgressTimeout);
        autoProgressTimeout = null;
    }
}

function updateProgress() {
    if (!quizData || quizData.length === 0) return;
    
    const progress = ((currentQuestion + 1) / quizData.length) * 100;
    progressBar.style.width = progress + '%';
}

function showResults() {
    // Clear all timers
    clearAllTimers();
    
    quizScreen.classList.remove('active');
    resultScreen.classList.add('active');

    finalScoreSpan.textContent = score;
    const percentage = quizData.length > 0 ? Math.round((score / quizData.length) * 100) : 0;
    percentageSpan.textContent = percentage;

    let message = '';
    if (percentage >= 90) {
        message = '🏆 Outstanding! You\'re a quiz master!';
    } else if (percentage >= 70) {
        message = '🎉 Great job! You have excellent knowledge!';
    } else if (percentage >= 50) {
        message = '👍 Good effort! Keep learning!';
    } else {
        message = '💪 Don\'t give up! Practice makes perfect!';
    }

    resultMessage.textContent = message;
}

function restartQuiz() {
    // Clear all timers
    clearAllTimers();
    
    currentQuestion = 0;
    score = 0;
    selectedAnswer = null;
    scoreSpan.textContent = score;
    currentQuestionSpan.textContent = 1;
    progressBar.style.width = '0%';
    
    resultScreen.classList.remove('active');
    startScreen.classList.add('active');
}

// Initialize - Disable start button until questions are loaded
startBtn.disabled = true;
startBtn.textContent = 'Loading Questions...';

// Load questions when page loads
loadQuestionsFromJSON();