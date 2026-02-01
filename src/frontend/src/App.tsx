import { useState } from 'react'
import './App.css'

function App() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMessage = { role: 'user', text: input }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch(`http://localhost:3000/chat?question=${encodeURIComponent(input)}`)
      
      if (!response.ok) {
        throw new Error('Falha na comunicação com o servidor')
      }

      const data = await response.json()
      
      setMessages((prev) => [...prev, { role: 'assistant', text: data.answer }])
    } catch (error) {
      console.error(error)
      setMessages((prev) => [...prev, { role: 'assistant', text: "Erro: Não consegui conectar ao servidor. Verifique se o terminal do backend (node server.js) está rodando e sem erros." }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container">
      <h1>Chatbot Gemini RAG</h1>
      <div className="chat-container">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.role}`}>
            <strong>{msg.role === 'user' ? 'Você' : 'IA'}:</strong>
            <p>{msg.text}</p>
          </div>
        ))}
        {isLoading && <p className="loading">Pensando...</p>}
      </div>
      <form onSubmit={handleSubmit} className="input-form">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Digite sua pergunta..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>
          Enviar
        </button>
      </form>
    </div>
  )
}

export default App