<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Todo App - BaseUI</title>

    @vite(['resources/css/app.css'])

    <!-- React and BaseUI CDN -->
    <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>

    <style>
        .todo-item {
            transition: all 0.3s ease;
        }
        .todo-item.completed {
            opacity: 0.6;
        }
        .todo-item.completed .todo-text {
            text-decoration: line-through;
        }
    </style>
</head>
<body class="antialiased bg-gray-50 dark:bg-gray-900">
    <div id="root" class="min-h-screen flex items-center justify-center p-4"></div>

    <script type="text/babel">
        const { useState, useEffect } = React;

        function TodoApp() {
            const [todos, setTodos] = useState([]);
            const [inputValue, setInputValue] = useState('');
            const [filter, setFilter] = useState('all');

            useEffect(() => {
                const savedTodos = localStorage.getItem('todos');
                if (savedTodos) {
                    setTodos(JSON.parse(savedTodos));
                }
            }, []);

            useEffect(() => {
                localStorage.setItem('todos', JSON.stringify(todos));
            }, [todos]);

            const addTodo = () => {
                if (inputValue.trim()) {
                    const newTodo = {
                        id: Date.now(),
                        text: inputValue,
                        completed: false,
                        createdAt: new Date().toISOString()
                    };
                    setTodos([...todos, newTodo]);
                    setInputValue('');
                }
            };

            const toggleTodo = (id) => {
                setTodos(todos.map(todo =>
                    todo.id === id ? { ...todo, completed: !todo.completed } : todo
                ));
            };

            const deleteTodo = (id) => {
                setTodos(todos.filter(todo => todo.id !== id));
            };

            const clearCompleted = () => {
                setTodos(todos.filter(todo => !todo.completed));
            };

            const filteredTodos = todos.filter(todo => {
                if (filter === 'active') return !todo.completed;
                if (filter === 'completed') return todo.completed;
                return true;
            });

            const activeTodoCount = todos.filter(todo => !todo.completed).length;
            const completedTodoCount = todos.filter(todo => todo.completed).length;

            return (
                <div className="w-full max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-xl">
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 text-center">
                            Todo App
                        </h1>

                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && addTodo()}
                                placeholder="What needs to be done?"
                                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            />
                            <button
                                onClick={addTodo}
                                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                            >
                                Add Todo
                            </button>
                        </div>
                    </div>

                    <div className="p-6">
                        <div className="flex gap-2 mb-4">
                            <button
                                onClick={() => setFilter('all')}
                                className={`px-4 py-2 rounded-lg transition-colors ${
                                    filter === 'all'
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                }`}
                            >
                                All ({todos.length})
                            </button>
                            <button
                                onClick={() => setFilter('active')}
                                className={`px-4 py-2 rounded-lg transition-colors ${
                                    filter === 'active'
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                }`}
                            >
                                Active ({activeTodoCount})
                            </button>
                            <button
                                onClick={() => setFilter('completed')}
                                className={`px-4 py-2 rounded-lg transition-colors ${
                                    filter === 'completed'
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                }`}
                            >
                                Completed ({completedTodoCount})
                            </button>
                            {completedTodoCount > 0 && (
                                <button
                                    onClick={clearCompleted}
                                    className="ml-auto px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                                >
                                    Clear Completed
                                </button>
                            )}
                        </div>

                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {filteredTodos.length === 0 ? (
                                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                                    {filter === 'completed'
                                        ? 'No completed todos'
                                        : filter === 'active'
                                            ? 'No active todos'
                                            : 'No todos yet. Add one above!'}
                                </p>
                            ) : (
                                filteredTodos.map(todo => (
                                    <div
                                        key={todo.id}
                                        className={`todo-item flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-all ${
                                            todo.completed ? 'completed' : ''
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={todo.completed}
                                            onChange={() => toggleTodo(todo.id)}
                                            className="w-5 h-5 text-blue-500 rounded focus:ring-blue-500"
                                        />
                                        <span className="todo-text flex-1 text-gray-900 dark:text-white">
                                            {todo.text}
                                        </span>
                                        <button
                                            onClick={() => deleteTodo(todo.id)}
                                            className="px-3 py-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900 rounded transition-colors"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 text-center text-sm text-gray-500 dark:text-gray-400">
                        <p>{activeTodoCount} item{activeTodoCount !== 1 ? 's' : ''} left</p>
                    </div>
                </div>
            );
        }

        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(<TodoApp />);
    </script>
</body>
</html>