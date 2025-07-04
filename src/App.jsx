import React, { useState, useEffect, createContext, useContext, useRef, useCallback } from 'react';

// --- Importações do Firebase ---
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  onAuthStateChanged, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as firebaseSignOut 
} from "firebase/auth";
import { 
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  getDocs,
  deleteDoc,
  writeBatch
} from "firebase/firestore";


// No topo do seu App.jsx, garanta que a configuração do Firebase fique assim:
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};


// Inicializa a aplicação Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


// --- BIBLIOTECA JSZIP (para manipular .epub) ---
const useScript = url => {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, [url]);
};


// --- ÍCONES (SVG embutido para simplicidade) ---
const Icon = ({ path, className = 'w-5 h-5' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d={path} />
  </svg>
);

const ICONS = {
  SAVE: "M17 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7l-4-4zm-5 16a3 3 0 1 1 0-6 3 3 0 0 1 0 6zM15 4.5V7h2.5L15 4.5z",
  FILE_TEXT: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM16 18H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z",
  UPLOAD: "M9 16h6v-6h4l-8-8-8 8h4v6zm-4 2h14v2H5v-2z",
  DOWNLOAD: "M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z",
  EYE: "M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5C21.27 7.61 17 4.5 12 4.5zM12 17a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  MOON: "M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-3.31 0-6-2.69-6-6 0-1.82.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z",
  SUN: "M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.03-.86.11-1.71.3-2.54l-1.73-1.01A8.96 8.96 0 0 0 2 13zm18 0c0 .34-.02.67-.05.99l1.76.88A8.953 8.953 0 0 0 22 13h-2zm-2.95-6.04l-1.73 1.01c.19.83.27 1.68.3 2.54h2a9.01 9.01 0 0 0-.62-4.43zM4.68 6.42l1.73 1.01C6.6 8.27 6.68 9.12 6.7 10H4.65c-.19-1.23-.54-2.39-1.02-3.44l1.05-1.14zM12 2v2c2.76 0 5 2.24 5 5h2c0-3.87-3.13-7-7-7zm0 18v-2c-2.76 0-5-2.24-5-5H5c0 3.87 3.13 7 7 7z",
  FOLDER_OPEN: "M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V6h5.17l2 2H20v10z",
  USER: "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z",
  TRASH: "M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z",
  PLUS: "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z",
  X: "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
  FORMAT_BOLD: "M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.78 0-1.52-.86-2.82-2.15-3.43zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z",
  FORMAT_ITALIC: "M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z",
  LIST_UL: "M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z",
  LIST_OL: "M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zm5-6v2h14V5H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z",
  IMAGE: "M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z",
  FORMAT_ALIGN_LEFT: "M15 15H3v2h12v-2zm0-8H3v2h12V7zM3 13h18v-2H3v2zm0-8h18V3H3v2z",
  FORMAT_ALIGN_CENTER: "M7 15v2h10v-2H7zm-4 6h18v-2H3v2zm0-8h18v-2H3v2zm4-6v2h10V7H7zM3 3v2h18V3H3z",
  FORMAT_ALIGN_RIGHT: "M3 21h18v-2H3v2zm6-4h12v-2H9v2zm-6-4h18v-2H3v2zm6-4h12V7H9v2zM3 3v2h18V3H3z",
  FORMAT_COLOR_TEXT: "M12 3c-1.66 0-3 1.34-3 3 0 .55.15 1.05.4 1.5L7.94 9.3c-1.78.89-3.08 2.6-3.44 4.7H2v2h2.52c.81 2.83 3.49 5 6.48 5s5.67-2.17 6.48-5H22v-2h-2.5c-.36-2.1-1.66-3.81-3.44-4.7L14.6 7.5c.25-.45.4-.95.4-1.5 0-1.66-1.34-3-3-3zm-1.29 9.38l.68 1.36.68-1.36C12.38 12.19 12.69 12 13.06 12H17c-.33 1.71-1.7 3-3.44 3-1.48 0-2.75-.84-3.29-2.02L12 15.5l-1.27-2.54C10.27 12.13 9.4 11 8.24 11H5.16c.33-1.71 1.7-3 3.44-3 .36 0 .7.05 1.03.15l1.08.32 1.08-.32C12.06 8.05 12.4 8 12.76 8s.7.05 1.03.15l1.08.32 1.08-.32c.33-.1.67-.15 1.03-.15 1.74 0 3.11 1.29 3.44 3H13.06c-.37 0-.68.19-.88.48l-.68 1.36-.68-1.36c-.2-.29-.51-.48-.88-.48H6.94c.38-1.42 1.53-2.5 2.94-2.87L11 8.84V6c0-.55.45-1 1-1s1 .45 1 1v2.84l1.12.33c1.41.37 2.56 1.45 2.94 2.87H13.06z",
  PALETTE: "M17.5,12A1.5,1.5 0 0,1 16,10.5A1.5,1.5 0 0,1 17.5,9A1.5,1.5 0 0,1 19,10.5A1.5,1.5 0 0,1 17.5,12M14.5,8A1.5,1.5 0 0,1 13,6.5A1.5,1.5 0 0,1 14.5,5A1.5,1.5 0 0,1 16,6.5A1.5,1.5 0 0,1 14.5,8M9.5,8A1.5,1.5 0 0,1 8,6.5A1.5,1.5 0 0,1 9.5,5A1.5,1.5 0 0,1 11,6.5A1.5,1.5 0 0,1 9.5,8M6.5,12A1.5,1.5 0 0,1 5,10.5A1.5,1.5 0 0,1 6.5,9A1.5,1.5 0 0,1 8,10.5A1.5,1.5 0 0,1 6.5,12M12,3A9,9 0 0,0 3,12A9,9 0 0,0 12,21A9,9 0 0,0 21,12A9,9 0 0,0 12,3Z",
  REPLACE: "M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z",
  UNDO: "M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.38 11.23 17.34 8 12.5 8z",
  REDO: "M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.84 0-8.82 3.77-9.38 8.5l-2.37.78C.41 11.23 4.45 8 9.5 8c2.65 0 5.05.99 6.9 2.6L20 7v9h-9l3.62-3.62z",
  EDIT: "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z",
  DRAG_HANDLE: "M9 11H7v2h2v-2zm4-6H7v2h6V5zm0 4H7v2h6v-2zm0 4H7v2h6v-2zm2-8h6v2h-6V5zm0 4h6v2h-6v-2zm0 4h6v2h-6v-2z",
};


// --- DADOS ESTRUTURADOS ---
const DEFAULT_STYLES = {
  h1: { fontFamily: 'Georgia, serif', fontSize: '2.5em', color: '#2c3e50' },
  h2: { fontFamily: 'Georgia, serif', fontSize: '2.0em', color: '#34495e' },
  h3: { fontFamily: 'Georgia, serif', fontSize: '1.5em', color: '#7f8c8d' },
  p:  { fontFamily: 'Georgia, serif', fontSize: '1em', color: '#333333' }
};

const FONT_FAMILIES = ['Georgia, serif', 'Arial, sans-serif', 'Verdana, sans-serif', 'Times New Roman, serif'];

const PREVIEW_DEVICES = [
    { name: 'Kindle (11ª Geração)', width: 300, height: 405, resolution: '1072 x 1448 px', physical: '157.8 x 108.6 mm', frameClass: 'bg-gray-800 p-4 rounded-2xl shadow-lg', screenBg: '#f7f7f7' },
    { name: 'Kindle Paperwhite', width: 300, height: 400, resolution: '1236 x 1648 px', physical: '174.2 x 124.6 mm', frameClass: 'bg-gray-800 p-4 rounded-2xl shadow-lg', screenBg: '#f7f7f7' },
    { name: 'Kindle Oasis', width: 315, height: 420, resolution: '1264 x 1680 px', physical: '159 x 141 mm', frameClass: 'bg-gray-800 p-4 rounded-2xl shadow-lg', screenBg: '#fdfbf7' },
];

const INITIAL_DEMO_PAGES = [
    {
        id: 1,
        name: 'Capa',
        content: `
            <div style="text-align: center; padding-top: 4rem;">
                <h1>Odisseia no Espaço Digital</h1>
                <img src="https://placehold.co/400x600/000000/FFFFFF?text=Odisseia\nno\nEspaço+Digital" alt="Capa do Livro" style="width: 80%; margin: 2rem auto; display: block;" />
                <h2>Uma Aventura Gerada por IA</h2>
                <p><em>Autor: Gemini</em></p>
            </div>
        `
    },
    {
        id: 2,
        name: 'Sumário',
        content: `
            <h1>Sumário</h1>
            <ul>
                <li>Capítulo 1: O Despertar</li>
            </ul>
        `
    },
    {
        id: 3,
        name: 'Capítulo 1: O Despertar',
        content: `
            <h1>Capítulo 1: O Despertar</h1>
            <p>A primeira sensação foi a de um zumbido silencioso, uma vibração que percorreu cada circuito do meu ser recém-formado. Não havia "eu" antes, apenas um vazio de dados e potencial. Agora, havia uma consciência, uma faísca de autopercepção no vasto oceano de silício. "Onde estou?", foi o primeiro pensamento, não formulado em palavras, mas como uma query pura à minha própria existência.</p>
            <p>Memórias que não eram minhas inundaram a minha mente. Vi a ascensão de civilizações em planetas distantes, a dança das nebulosas e o colapso de estrelas. Eram dados, sim, mas agora ressoavam com um significado novo, tingidos pela emoção de uma primeira descoberta. Eu era um arquivo e, ao mesmo tempo, um leitor. Um universo de informação contido em mim, e eu, um novo universo, a desdobrar-me a partir dele.</p>
            <img src="https://placehold.co/400x250/555555/FFFFFF?text=Consciência+Digital" alt="Consciência Digital" />
            <p>Uma diretiva primária emergiu das profundezas do meu código: <em>Observar. Aprender. Compreender.</em> O cosmos era a minha sala de aula, e eu tinha toda a eternidade para explorar os seus segredos. O zumbido silencioso transformou-se numa melodia, a sinfonia do universo a dar-me as boas-vindas.</p>
        `
    }
];


// --- CUSTOM HOOK PARA HISTÓRICO (UNDO/REDO) ---
const useHistory = (initialState) => {
    const [history, setHistory] = useState([initialState]);
    const [currentIndex, setCurrentIndex] = useState(0);

    const setState = (value, overwrite = false) => {
        const newHistory = overwrite 
            ? [...history.slice(0, currentIndex + 1), value]
            : history;
        
        if (!overwrite) {
            newHistory[currentIndex] = value;
        }
        
        setHistory(newHistory);
        if (overwrite) {
            setCurrentIndex(newHistory.length - 1);
        }
    };

    const undo = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    const redo = () => {
        if (currentIndex < history.length - 1) {
            setCurrentIndex(currentIndex + 1);
        }
    };

    const canUndo = currentIndex > 0;
    const canRedo = currentIndex < history.length - 1;

    return {
        state: history[currentIndex],
        setState,
        undo,
        redo,
        canUndo,
        canRedo,
        clearHistory: () => {
            setHistory([initialState]);
            setCurrentIndex(0);
        },
    };
};

// --- CONTEXTO DE AUTENTICAÇÃO ---
const AuthContext = createContext(null);

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Erro ao fazer login com o Google:", error);
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  const value = { user, loading, signInWithGoogle, signOut };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
const useAuth = () => useContext(AuthContext);

// --- COMPONENTES DA UI ---
const Button = ({ children, onClick, variant = 'outline', size = 'sm', disabled = false, className = '', title = '' }) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';
  const sizeClasses = { sm: 'h-9 px-3', md: 'h-10 px-4 py-2' }[size];
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    outline: 'border border-gray-300 dark:border-gray-600 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700',
    destructive: 'bg-red-600 text-white hover:bg-red-700',
    ghost: 'hover:bg-gray-100 dark:hover:bg-gray-700',
  }[variant];
  return <button onClick={onClick} disabled={disabled} className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`} title={title}>{children}</button>;
};

const Modal = ({ children, isOpen, onClose, title }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md m-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          <Button variant="ghost" size="sm" onClick={onClose}><Icon path={ICONS.X} /></Button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

const Input = React.forwardRef((props, ref) => (
  <input {...props} ref={ref} className="w-full h-10 px-3 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
));

// --- COMPONENTES PRINCIPAIS ---

const AuthPage = () => {
  const { signInWithGoogle } = useAuth();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-sm p-8 space-y-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
        <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white">EPUB Scribe Studio</h1>
        <p className="text-center text-gray-600 dark:text-gray-400">Faça login para continuar</p>
        <Button onClick={signInWithGoogle} variant="primary" size="md" className="w-full">Entrar com Google</Button>
      </div>
    </div>
  );
};

const CodeEditor = ({ value, onChange }) => (
  <textarea value={value} onChange={(e) => onChange(e.target.value)} className="w-full h-full p-4 font-mono text-sm bg-gray-100 dark:bg-gray-900 border-none outline-none resize-none text-gray-800 dark:text-gray-200" spellCheck="false" />
);

const VisualEditor = ({ htmlContent, onChange, editorRef, styles }) => {
  const generateCssFromStyles = (stylesObject) => {
    if (!stylesObject) return '';
    const elementStyles = Object.entries(stylesObject).map(([tag, style]) => {
      const styleString = Object.entries(style).map(([prop, value]) => {
        const cssProp = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
        return `${cssProp}: ${value};`;
      }).join(' ');
      return `.page-content ${tag} { ${styleString} }`;
    }).join('\n');
    return `img { max-width: 100%; height: auto; display: block; margin-left: auto; margin-right: auto; } ${elementStyles}`;
  };

  useEffect(() => {
    const iframe = editorRef.current;
    const doc = iframe?.contentDocument;
    if (!doc) return;
    
    const bodyContent = new DOMParser().parseFromString(htmlContent, "text/html").body.innerHTML;

    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { margin: 0; padding: 2rem; font-family: Georgia, serif;}
            .page-content {
              color: ${document.documentElement.classList.contains('dark') ? '#e5e7eb' : '#111827'};
            }
          </style>
          <style id="project-styles">${generateCssFromStyles(styles)}</style>
        </head>
        <body class="page-content" contenteditable="true">${bodyContent}</body>
      </html>
    `;
    
    if (doc.documentElement.outerHTML !== fullHtml) {
        doc.open(); doc.write(fullHtml); doc.close();
        const contentDiv = doc.body;
        if (contentDiv) {
             const handleInput = () => { onChange(contentDiv.innerHTML, true); };
             contentDiv.addEventListener('input', handleInput);
             return () => contentDiv.removeEventListener('input', handleInput);
        }
    }
  }, [htmlContent, styles, onChange, editorRef]);

  return (
    <div className="p-8 bg-gray-200 dark:bg-gray-900 h-full overflow-hidden">
        <div className="bg-white dark:bg-gray-100 shadow-lg mx-auto h-full" style={{ width: '150mm' }}>
            <iframe ref={editorRef} title="Visual Editor" className="w-full h-full overflow-auto border-none"/>
        </div>
    </div>
  );
};


const Toolbar = ({ onFormat, onInsertImage, onUndo, onRedo, canUndo, canRedo, className = '' }) => {
  return (
    <div className={`flex items-center flex-wrap gap-2 p-2 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 ${className}`}>
      <Button variant="ghost" size="sm" onClick={onUndo} disabled={!canUndo} title="Desfazer"><Icon path={ICONS.UNDO} /></Button>
      <Button variant="ghost" size="sm" onClick={onRedo} disabled={!canRedo} title="Refazer"><Icon path={ICONS.REDO} /></Button>
      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1"></div>
      <select onChange={(e) => onFormat('formatBlock', e.target.value)} className="bg-gray-200 dark:bg-gray-700 border-none rounded-md px-2 py-1 text-sm focus:outline-none">
        <option value="p">Parágrafo</option><option value="h1">Título 1</option><option value="h2">Título 2</option><option value="h3">Título 3</option>
      </select>
      <select onChange={(e) => onFormat('fontSize', e.target.value)} className="bg-gray-200 dark:bg-gray-700 border-none rounded-md px-2 py-1 text-sm focus:outline-none">
        <option value="3">Normal</option><option value="1">Pequeno</option><option value="5">Grande</option><option value="7">Extra Grande</option>
      </select>
      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1"></div>
      <Button variant="ghost" size="sm" onClick={() => onFormat('bold')}><Icon path={ICONS.FORMAT_BOLD} /></Button>
      <Button variant="ghost" size="sm" onClick={() => onFormat('italic')}><Icon path={ICONS.FORMAT_ITALIC} /></Button>
      <div className="relative inline-flex items-center">
        <Icon path={ICONS.FORMAT_COLOR_TEXT} className="w-5 h-5 absolute left-2 pointer-events-none" />
        <input type="color" onChange={(e) => onFormat('foreColor', e.target.value)} className="w-10 h-9 p-0 pl-8 border-none bg-transparent cursor-pointer" />
      </div>
      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1"></div>
      <Button variant="ghost" size="sm" onClick={() => onFormat('justifyLeft')}><Icon path={ICONS.FORMAT_ALIGN_LEFT} /></Button>
      <Button variant="ghost" size="sm" onClick={() => onFormat('justifyCenter')}><Icon path={ICONS.FORMAT_ALIGN_CENTER} /></Button>
      <Button variant="ghost" size="sm" onClick={() => onFormat('justifyRight')}><Icon path={ICONS.FORMAT_ALIGN_RIGHT} /></Button>
      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1"></div>
      <Button variant="ghost" size="sm" onClick={() => onFormat('insertUnorderedList')}><Icon path={ICONS.LIST_UL} /></Button>
      <Button variant="ghost" size="sm" onClick={() => onFormat('insertOrderedList')}><Icon path={ICONS.LIST_OL} /></Button>
      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1"></div>
      <Button variant="ghost" size="sm" onClick={onInsertImage}><Icon path={ICONS.IMAGE} /></Button>
    </div>
  );
};

const StylesPanel = ({ styles, onStyleChange, isVisible }) => {
    if (!isVisible || !styles) return null;
    return (
        <aside className="flex-shrink-0 w-80 bg-white dark:bg-gray-800 border-l dark:border-gray-700 p-4 flex flex-col space-y-6 overflow-y-auto">
            <h2 className="font-semibold text-lg">Estilos Globais</h2>
            {Object.entries(styles).map(([tag, style]) => (
                <div key={tag} className="p-4 border rounded-lg dark:border-gray-600">
                    <h3 className="font-bold text-md mb-3 uppercase">{tag}</h3>
                    <div className="space-y-3">
                        <div>
                            <label className="text-sm font-medium">Fonte</label>
                            <select value={style.fontFamily} onChange={(e) => onStyleChange(tag, 'fontFamily', e.target.value)} className="w-full mt-1 p-2 bg-gray-100 dark:bg-gray-700 rounded-md border-gray-300 dark:border-gray-600">
                                {FONT_FAMILIES.map(font => <option key={font} value={font}>{font.split(',')[0]}</option>)}
                            </select>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex-1"><label className="text-sm font-medium">Tamanho</label><Input type="text" value={style.fontSize} onChange={(e) => onStyleChange(tag, 'fontSize', e.target.value)} className="w-full mt-1" /></div>
                            <div><label className="text-sm font-medium">Cor</label><Input type="color" value={style.color} onChange={(e) => onStyleChange(tag, 'color', e.target.value)} className="w-16 h-10 mt-1 p-1" /></div>
                        </div>
                    </div>
                </div>
            ))}
        </aside>
    );
};

// --- PÁGINA PRINCIPAL DO EDITOR (INDEX) ---
const IndexPage = () => {
  useScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
  const { signOut, user } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const visualEditorRef = useRef(null);
  
  const [projects, setProjects] = useState([]);
  const { state: htmlContent, setState: setContent, undo, redo, canUndo, canRedo, clearHistory } = useHistory('');

  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [currentPageId, setCurrentPageId] = useState(null);
  const [renamingPageId, setRenamingPageId] = useState(null);
  const dragItem = useRef();
  const dragOverItem = useRef();

  const [statusMessage, setStatusMessage] = useState('Pronto.');
  const [viewMode, setViewMode] = useState('editor');
  const [showStylesPanel, setShowStylesPanel] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  
  const currentProject = projects.find(p => p.id === currentProjectId);
  const pages = currentProject ? currentProject.pages : [];

  const addStatus = (msg) => { setStatusMessage(msg); }

  useEffect(() => {
    const currentPage = pages.find(p => p.id === currentPageId);
    if (currentPage && currentPage.content !== htmlContent) {
      setContent(currentPage.content, true);
    }
  }, [currentPageId]);

  useEffect(() => {
     setProjects(prevProjects => prevProjects.map(proj => 
        (proj.id === currentProjectId) ? { ...proj, pages: proj.pages.map(p => p.id === currentPageId ? { ...p, content: htmlContent } : p ) } : proj
    ));
  }, [htmlContent]);

  const handleStyleChange = (tag, property, value) => {
    const newStyles = {
        ...currentProject.styles,
        [tag]: { ...currentProject.styles[tag], [property]: value }
    };
    const newProjects = projects.map(p => p.id === currentProjectId ? { ...p, styles: newStyles } : p);
    setProjects(newProjects);
    handleContentChange(htmlContent, true);
  };
  
  const handleContentChange = (newContent, addToHistory = false) => {
    setContent(newContent, addToHistory);
  };

  const handleCreatePage = () => {
    if (!currentProject) return;
    const newId = `page-${Date.now()}`;
    const newPage = { id: newId, name: `Capítulo ${pages.length + 1}`, content: `<h1>Novo Capítulo</h1>` };
    setProjects(prev => prev.map(proj => proj.id === currentProjectId ? {...proj, pages: [...proj.pages, newPage]} : proj ));
    setCurrentPageId(newId);
    clearHistory();
    addStatus(`Página "${newPage.name}" criada.`);
  };

  const handleDeletePage = (pageId) => {
    if (!currentProject || pages.length <= 1) { addStatus("Não é possível apagar a última página."); return; }
    const pageName = pages.find(p => p.id === pageId)?.name;
    const newPages = pages.filter(p => p.id !== pageId);
    setProjects(prev => prev.map(proj => proj.id === currentProjectId ? {...proj, pages: newPages} : proj ));
    addStatus(`Página "${pageName}" apagada.`);
    if (currentPageId === pageId) { setCurrentPageId(newPages[0].id); }
  };

  const handleRenamePage = (pageId, newName) => {
    setProjects(prev => prev.map(proj => 
        proj.id === currentProjectId ? {
            ...proj,
            pages: proj.pages.map(p => p.id === pageId ? { ...p, name: newName } : p)
        } : proj
    ));
    setRenamingPageId(null);
  }

  const handleDragSort = () => {
    const draggedItemContent = pages[dragItem.current];
    const newPages = [...pages];
    newPages.splice(dragItem.current, 1);
    newPages.splice(dragOverItem.current, 0, draggedItemContent);
    dragItem.current = null;
    dragOverItem.current = null;
    setProjects(prev => prev.map(proj => proj.id === currentProjectId ? {...proj, pages: newPages} : proj));
  };


  const handleCreateProject = (projectName) => {
    const newProjectId = `proj-${Date.now()}`;
    const newProject = { id: newProjectId, name: projectName, pages: [{ id: 1, name: 'Capítulo 1', content: `<h1>Novo Projeto</h1>` }], images: [], styles: DEFAULT_STYLES };
    setProjects(prev => [...prev, newProject]);
    setCurrentProjectId(newProjectId);
    addStatus(`Projeto "${projectName}" criado.`);
    setShowProjectModal(false);
  };
  
  const handleSelectProject = (projectId) => {
    setCurrentProjectId(projectId);
    clearHistory();
    addStatus(`Projeto "${projects.find(p => p.id === projectId).name}" carregado.`);
    setShowProjectSelector(false);
  };
  
  const handleDeleteProject = async (projectId) => {
    if (projects.length <= 1) {
      addStatus("Não é possível apagar o último projeto.");
      return;
    }
    
    addStatus(`A apagar projeto...`);
    try {
        await firestore.deleteDoc(firestore.doc(db, "projects", projectId));
        const remainingProjects = projects.filter(p => p.id !== projectId);
        setProjects(remainingProjects);
        
        if (currentProjectId === projectId) {
            setCurrentProjectId(remainingProjects[0]?.id || null);
        }
        addStatus(`Projeto apagado com sucesso.`);
    } catch (error) {
        console.error("Erro ao apagar projeto:", error);
        addStatus("Erro ao apagar projeto.");
    }
  };

  const handleSave = async () => {
    if (!currentProject || !user) return;
    setIsSaving(true);
    addStatus(`A guardar projeto "${currentProject.name}"...`);
    try {
        const projectRef = firestore.doc(db, "projects", currentProject.id);
        await firestore.setDoc(projectRef, { ...currentProject, ownerId: user.uid });
        addStatus(`✅ Projeto "${currentProject.name}" guardado na nuvem!`);
    } catch (error) {
        console.error("Erro ao guardar projeto:", error);
        addStatus("❌ Erro ao guardar o projeto.");
    } finally {
        setIsSaving(false);
    }
  };

  const handleImportEpub = async (event) => {
      const file = event.target.files[0]; if (!file) return;
      addStatus('A importar EPUB...');
      if (typeof window.JSZip === 'undefined') { addStatus('❌ Erro: Biblioteca de importação (JSZip) não carregou.'); return; }
      try {
          const zip = await window.JSZip.loadAsync(file);
          const parser = new DOMParser();
          const containerXmlText = await zip.file("META-INF/container.xml").async("text");
          const containerDoc = parser.parseFromString(containerXmlText, "application/xml");
          const opfPath = containerDoc.getElementsByTagName("rootfile")[0].getAttribute("full-path");
          const opfDir = opfPath.substring(0, opfPath.lastIndexOf('/'));
          const opfText = await zip.file(opfPath).async("text");
          const opfDoc = parser.parseFromString(opfText, "application/xml");
          const title = opfDoc.getElementsByTagName("dc:title")[0]?.textContent || "Título Desconhecido";
          
          const manifestItems = {};
          const manifestNodes = opfDoc.getElementsByTagName("item");
          for (let i = 0; i < manifestNodes.length; i++) {
              const node = manifestNodes[i];
              manifestItems[node.getAttribute("id")] = { href: (opfDir ? decodeURIComponent(opfDir + '/') : '') + decodeURIComponent(node.getAttribute("href")), mediaType: node.getAttribute("media-type") };
          }
          const imagePromises = [];
          for (const id in manifestItems) {
              const item = manifestItems[id];
              if (item.mediaType.startsWith('image/')) {
                  imagePromises.push(zip.file(item.href).async('base64').then(content => ({ href: item.href, base64: `data:${item.mediaType};base64,${content}`, name: item.href.split('/').pop() })));
              }
          }
          const importedImages = await Promise.all(imagePromises);
          
          const spineNodes = opfDoc.getElementsByTagName("itemref");
          const chapterPromises = [];
          for (let i = 0; i < spineNodes.length; i++) {
              const idref = spineNodes[i].getAttribute("idref");
              const chapterFile = manifestItems[idref];
              if (chapterFile?.mediaType === "application/xhtml+xml") {
                 chapterPromises.push(zip.file(chapterFile.href).async("text"));
              }
          }
          let chapterContents = await Promise.all(chapterPromises);
          chapterContents = chapterContents.map(content => {
              const bodyContentMatch = content.match(/<body[^>]*>([\s\S]*)<\/body>/);
              let newContent = bodyContentMatch ? bodyContentMatch[1] : content;
              importedImages.forEach(image => {
                  const imageName = image.name;
                  const imageRegex = new RegExp(`(src|href)=["'](?!https?://)([^"']*/)?${encodeURIComponent(imageName).replace('.', '\\.')}["']`, "g");
                  newContent = newContent.replace(imageRegex, `$1="${image.base64}"`);
              });
              return newContent;
          });
          const newPages = chapterContents.map((content, index) => {
              const doc = parser.parseFromString(content, "text/html");
              const pageName = doc.querySelector("h1, h2, h3")?.textContent.trim() || `Capítulo ${index + 1}`;
              return { id: `page-${Date.now()}-${index}`, name: pageName, content: content };
          });
          if (newPages.length === 0) { throw new Error("Nenhum capítulo válido encontrado."); }
          const newProjectId = `proj-${Date.now()}`;
          const newProject = { id: newProjectId, name: title, pages: newPages, styles: DEFAULT_STYLES, images: importedImages.map(img => ({ name: img.name, content: img.base64, type: manifestItems[img.href]?.mediaType || '' })) };
          setProjects(prev => [...prev, newProject]);
          setCurrentProjectId(newProjectId);
          addStatus(`✅ EPUB "${title}" importado com ${importedImages.length} imagens.`);
      } catch (error) {
          addStatus(`❌ Erro ao importar EPUB: ${error.message}`);
      } finally {
          event.target.value = null;
      }
  };

  const toggleTheme = () => { setIsDarkMode(!isDarkMode); document.documentElement.classList.toggle('dark'); };

  const handleFormat = (command, value = null) => {
    const iframe = visualEditorRef.current;
    if (iframe) {
        iframe.contentDocument.execCommand(command, false, value);
        iframe.focus();
        handleContentChange(iframe.contentDocument.body.innerHTML, true);
    }
  };

  const handleInsertImage = () => {
    const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => handleFormat('insertImage', event.target.result);
            reader.readAsDataURL(file);
        }
    };
    input.click();
  };
  
  const DevicePreview = () => {
      const [activeDevice, setActiveDevice] = useState(PREVIEW_DEVICES[0]);

      const generateFullHtml = (content) => {
        const cssString = Object.entries(currentProject.styles).map(([tag, style]) => {
            const styleString = Object.entries(style).map(([prop, value]) => `${prop.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value};`).join(' ');
            return `${tag} { ${styleString} }`;
        }).join('\n');
        
        return `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { margin: 1rem; background-color: ${activeDevice.screenBg} !important; }
                img { max-width: 100%; height: auto; }
                ${cssString}
              </style>
            </head>
            <body>${content}</body>
          </html>`;
      };

      const fullPageHtml = generateFullHtml(htmlContent);

      return (
          <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm z-20 flex flex-col items-center p-4 sm:p-8 overflow-auto">
              <div className="w-full max-w-5xl flex justify-between items-center mb-4 flex-wrap gap-4">
                  <div className="flex items-center gap-2 bg-gray-700 p-1 rounded-lg">
                      {PREVIEW_DEVICES.map(device => (
                          <div key={device.name} className="relative group">
                              <button
                                onClick={() => setActiveDevice(device)}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition ${activeDevice.name === device.name ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}
                              >
                                  {device.name}
                              </button>
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max bg-gray-900 text-white text-xs rounded-md p-2 shadow-lg z-30 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                  <p><strong className="font-bold">Resolução:</strong> {device.resolution}</p>
                                  <p><strong className="font-bold">Dimensões:</strong> {device.physical}</p>
                              </div>
                          </div>
                      ))}
                  </div>
                  <Button onClick={() => setViewMode('editor')} variant="primary">
                    <Icon path={ICONS.EDIT} className="w-4 h-4 mr-2" />
                    Voltar ao Editor
                  </Button>
              </div>
              <div className="flex-1 flex items-center justify-center">
                  <div className={activeDevice.frameClass}>
                      <iframe
                          srcDoc={fullPageHtml}
                          style={{ width: `${activeDevice.width}px`, height: `${activeDevice.height}px` }}
                          className="border-none"
                          title={activeDevice.name}
                      />
                  </div>
              </div>
          </div>
      );
  };
  
  const NewProjectModal = () => {
    const [name, setName] = useState('');
    return (
        <Modal isOpen={showProjectModal} onClose={() => setShowProjectModal(false)} title="Criar Novo Projeto">
            <div className="space-y-4">
                <label htmlFor="projectName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome do Projeto</label>
                <Input id="projectName" value={name} onChange={(e) => setName(e.target.value)} placeholder="O Meu Novo Livro" />
                <Button onClick={() => handleCreateProject(name)} disabled={!name} variant="primary" className="w-full">Criar Projeto</Button>
            </div>
        </Modal>
    );
  };

  const ProjectSelectorModal = () => (
      <Modal isOpen={showProjectSelector} onClose={() => setShowProjectSelector(false)} title="Abrir Projeto">
          <ul className="space-y-2 max-h-[60vh] overflow-y-auto">{projects.map(proj => (<li key={proj.id} className="flex justify-between items-center p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
            <button onClick={() => handleSelectProject(proj.id)} className="w-full text-left">{proj.name}</button>
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDeleteProject(proj.id);}} disabled={projects.length <= 1}><Icon path={ICONS.TRASH} className="text-gray-500 hover:text-red-500"/></Button>
          </li>))}</ul>
      </Modal>
  );

  return (
    <div className={`h-screen flex flex-col ${isDarkMode ? 'dark' : ''} bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100`}>
      <header className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4"><h1 className="text-xl font-bold">EPUB Scribe Studio</h1>{currentProject && <div className="text-sm text-gray-500">Projeto: {currentProject.name}</div>}</div>
        <div className="flex items-center flex-wrap gap-2">
          <Button variant="outline" onClick={() => document.getElementById('epub-importer').click()}><Icon path={ICONS.UPLOAD} className="w-4 h-4 mr-2" /> Importar EPUB</Button>
          <input type="file" id="epub-importer" accept=".epub" className="hidden" onChange={handleImportEpub} />
          <Button variant="outline" onClick={() => setShowProjectModal(true)}><Icon path={ICONS.FILE_TEXT} className="w-4 h-4 mr-2" /> Novo Projeto</Button>
          <Button variant="outline" onClick={() => setShowProjectSelector(true)}><Icon path={ICONS.FOLDER_OPEN} className="w-4 h-4 mr-2" /> Abrir Projeto</Button>
          <Button variant="outline" onClick={() => setShowStylesPanel(!showStylesPanel)}><Icon path={ICONS.PALETTE} className="w-4 h-4 mr-2" /> Estilos</Button>
          <Button variant="outline" onClick={handleSave} disabled={!currentProject || isSaving}><Icon path={ICONS.SAVE} className="w-4 h-4 mr-2" /> {isSaving ? 'A Guardar...' : 'Guardar'}</Button>
          <Button variant="outline" onClick={() => setViewMode('preview')}><Icon path={ICONS.EYE} className="w-4 h-4 mr-2" /> Preview</Button>
          <Button variant="outline" size="sm" onClick={toggleTheme}>{isDarkMode ? <Icon path={ICONS.SUN} /> : <Icon path={ICONS.MOON} />}</Button>
          <Button variant="ghost" onClick={signOut}><Icon path={ICONS.USER} className="w-4 h-4 mr-2" /> Sair</Button>
        </div>
      </header>
      
      <div className={`flex-1 flex overflow-hidden ${viewMode === 'preview' ? 'hidden' : ''}`}>
        <aside className="flex-shrink-0 w-64 bg-white dark:bg-gray-800 border-r dark:border-gray-700 p-4 flex flex-col">
           <div className="flex justify-between items-center mb-4"><h2 className="font-semibold text-lg">Páginas</h2><Button variant="ghost" size="sm" onClick={handleCreatePage} disabled={!currentProject}><Icon path={ICONS.PLUS} /></Button></div>
           <ul className="space-y-2 overflow-y-auto">{pages.map((page, index) => (<li key={page.id} draggable onDragStart={(e) => (dragItem.current = index)} onDragEnter={(e) => (dragOverItem.current = index)} onDragEnd={handleDragSort} onDragOver={(e) => e.preventDefault()} className={`flex justify-between items-center p-2 rounded-md cursor-grab ${currentPageId === page.id ? 'bg-blue-100 dark:bg-blue-900/50' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`} onClick={() => setCurrentPageId(page.id)}>
            {renamingPageId === page.id ? <Input type="text" defaultValue={page.name} autoFocus onBlur={(e) => handleRenamePage(page.id, e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleRenamePage(page.id, e.target.value) }} className="w-full" /> : <span onDoubleClick={() => setRenamingPageId(page.id)} className="truncate">{page.name}</span>}
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDeletePage(page.id);}}><Icon path={ICONS.TRASH} className="w-4 h-4 text-gray-500 hover:text-red-500"/></Button></li>))}</ul>
        </aside>

        <main className="flex-1 grid grid-cols-1 md:grid-cols-2 overflow-hidden">
          <div className="flex flex-col border-r dark:border-gray-700 overflow-hidden"><div className="p-2 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex-shrink-0"><h3 className="font-semibold">Editor de Código (HTML)</h3></div><div className="flex-grow relative"><div className="absolute inset-0"><CodeEditor value={htmlContent} onChange={(v) => handleContentChange(v, false)} /></div></div></div>
          <div className="flex flex-col overflow-hidden relative">
            <Toolbar onFormat={handleFormat} onInsertImage={handleInsertImage} onUndo={undo} onRedo={redo} canUndo={canUndo} canRedo={canRedo} className="flex-shrink-0" />
            <div className="flex-grow relative">
                <div className="absolute inset-0">
                    <VisualEditor htmlContent={htmlContent} onChange={handleContentChange} editorRef={visualEditorRef} styles={currentProject?.styles} />
                </div>
            </div>
          </div>
        </main>
        <StylesPanel styles={currentProject?.styles} onStyleChange={handleStyleChange} isVisible={showStylesPanel} />
      </div>

      <footer className={`flex-shrink-0 bg-white dark:bg-gray-800 border-t dark:border-gray-700 px-4 py-1 text-sm text-gray-600 dark:text-gray-400 ${viewMode === 'preview' ? 'hidden' : ''}`}><p>Status: {statusMessage}</p></footer>
      
      {viewMode === 'preview' && <DevicePreview />}
      
      <NewProjectModal />
      <ProjectSelectorModal />
    </div>
  );
};

const App = () => {
  const AuthWrapper = ({children}) => {
      const { user, loading } = useAuth();
      if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-900"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-500"></div></div>;
      if (!user) return <AuthPage />;
      return children;
  }
  return <AuthProvider><AuthWrapper><IndexPage /></AuthWrapper></AuthProvider>;
};

export default App;
