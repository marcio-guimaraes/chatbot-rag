import { useState, type FormEvent } from 'react';
import './App.css';

interface Message {
  text: string;
  sender: 'user' | 'bot';
}

function App() {
  const [input, setInput] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const userInput = input.trim();
    if (!userInput) return;

    // Adiciona a mensagem do usuário e limpa o input
    setMessages(prev => [...prev, { text: userInput, sender: 'user' }]);
    setInput('');
    setIsLoading(true);

    try {
      // Constrói a URL para o backend
      const url = `http://localhost:3000/chat?question=${encodeURIComponent(userInput)}`;
      
      // Chama o backend
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Falha na resposta do servidor.');
      }
      
      const data = await response.json();
      
      // Adiciona a resposta do bot à lista de mensagens
      setMessages(prev => [...prev, { text: data.answer, sender: 'bot' }]);

    } catch (error) {
      console.error("Erro ao buscar resposta:", error);
      // Adiciona uma mensagem de erro ao chat
      setMessages(prev => [...prev, { text: "Desculpe, não consegui obter uma resposta.", sender: 'bot' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-container">
      <div className="messages-area">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.sender}`}>
            {msg.text}
          </div>
        ))}
        {isLoading && <div className="message bot">Pensando...</div>}
      </div>
      <form className="input-area" onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Digite sua pergunta..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>Enviar</button>
      </form>
    </div>
  );
}

export default App;