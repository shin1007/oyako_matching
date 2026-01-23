import React from 'react';

interface Message {
  id: string;
  match_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
}

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  userRole: string | null;
  linkifyText: (text: string) => React.ReactNode;
}

export const MessageList: React.FC<MessageListProps> = ({ messages, currentUserId, userRole, linkifyText }) => (
  <>
    {messages.length === 0 ? (
      <div className="text-center py-12 text-gray-500">
        <div className="text-4xl mb-2">💬</div>
        <p>まだメッセージがありません</p>
        <p className="text-sm mt-1">最初のメッセージを送ってみましょう</p>
      </div>
    ) : (
      messages.map((message) => {
        const isOwnMessage = message.sender_id === currentUserId;
        return (
          <div
            key={message.id}
            className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] rounded-lg px-4 py-2 ${
                isOwnMessage
                  ? userRole === 'child'
                    ? 'bg-child-600 text-white'
                    : 'bg-parent-500 text-white'
                  : 'bg-gray-200 text-gray-900'
              }`}
            >
              <p className="whitespace-pre-wrap break-words">
                {linkifyText(message.content)}
              </p>
              <div className={`flex items-center justify-between gap-2 mt-1`}>
                <p
                  className={`text-xs ${
                    isOwnMessage
                      ? userRole === 'child'
                        ? 'text-child-100'
                        : 'text-parent-100'
                      : 'text-gray-500'
                  }`}
                >
                  {new Date(message.created_at).toLocaleString('ja-JP', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
                {isOwnMessage && (
                  <span
                    className={`text-xs ${
                      message.read_at
                        ? userRole === 'child'
                          ? 'text-child-200'
                          : 'text-parent-200'
                        : userRole === 'child'
                          ? 'text-child-300'
                          : 'text-parent-300'
                    }`}
                  >
                    {message.read_at ? '既読' : '未読'}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })
    )}
  </>
);