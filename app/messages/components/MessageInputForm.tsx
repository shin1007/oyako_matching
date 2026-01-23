import React from 'react';

interface MessageInputFormProps {
  newMessage: string;
  setNewMessage: (v: string) => void;
  sending: boolean;
  onSend: (e: React.FormEvent) => void;
}

export const MessageInputForm: React.FC<MessageInputFormProps> = ({ newMessage, setNewMessage, sending, onSend }) => (
  <form onSubmit={onSend} className="flex gap-2">
    <textarea
      value={newMessage}
      onChange={(e) => setNewMessage(e.target.value)}
      placeholder="メッセージを入力..."
      className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:outline-none resize-none"
      rows={2}
      disabled={sending}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          onSend(e);
        }
      }}
    />
    <button
      type="submit"
      disabled={!newMessage.trim() || sending}
      className="rounded-lg px-6 py-2 text-white disabled:opacity-50 disabled:cursor-not-allowed bg-child-600 hover:bg-child-700"
    >
      {sending ? '送信中...' : '送信'}
    </button>
  </form>
);