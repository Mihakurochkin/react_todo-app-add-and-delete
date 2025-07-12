import React, { useState, useEffect, useRef } from 'react';
import { addTodo, deleteTodo, getTodos, USER_ID } from './api/todos';
import { Todo } from './types/Todo';
import cn from 'classnames';
import { flushSync } from 'react-dom';

type FilterType = 'all' | 'active' | 'completed';

export const App: React.FC = () => {
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [errorMessage, setErrorMessage] = useState('');
  const [todos, setTodos] = useState<Todo[]>([]);
  const [hoveredTodoId, setHoveredTodoId] = useState<number | null>(null);
  const [selectedTodoId, setSelectedTodoId] = useState<number | null>(null);
  const [selectedTodoValue, setSelectedTodoValue] = useState<string>('');
  const [loadingTodoIds, setLoadingTodoIds] = useState<number[]>([]);
  const [searchInputValue, setSearchInputValue] = useState<string>('');
  const [tempTodo, setTempTodo] = useState<Todo | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function getFilteredTodos(): Todo[] {
    switch (filterType) {
      case 'all':
        return todos;
      case 'active':
        return todos.filter(todo => !todo.completed);
      case 'completed':
        return todos.filter(todo => todo.completed);
      default:
        return todos;
    }
  }

  function setErrorAndTimeout(value: string) {
    setErrorMessage(value);
    setTimeout(() => {
      setErrorMessage('');
    }, 3000);
  }

  function setTodoLoading(todoId: number, loading: boolean) {
    if (loadingTodoIds.includes(todoId)) {
      return;
    }

    setLoadingTodoIds((prevLoadingTodoIds: number[]) => {
      if (loading) {
        return [...prevLoadingTodoIds, todoId];
      } else {
        return prevLoadingTodoIds.filter((id: number) => id !== todoId);
      }
    });
  }

  async function handleTodoRemove(todoId: number) {
    try {
      setTodoLoading(todoId, true);
      await deleteTodo(todoId);
      setTodos(prevTodos => prevTodos.filter(todo => todo.id !== todoId));
    } catch {
      setErrorAndTimeout('Unable to delete a todo');
    } finally {
      setTodoLoading(todoId, false);
      inputRef.current?.focus();
    }
  }

  async function handleAddTodo(
    event: React.FormEvent<HTMLFormElement>,
    title: string,
  ) {
    event.preventDefault();
    if (searchInputValue.trim().length === 0) {
      setErrorAndTimeout('Title should not be empty');

      return;
    }

    setTempTodo({
      id: 0,
      title: title.trim(),
      completed: false,
      userId: USER_ID,
    });

    try {
      const newTodo = await addTodo({
        title: title.trim(),
        completed: false,
        userId: USER_ID,
      });

      setTodos(prevTodos => [...prevTodos, newTodo]);
      setSearchInputValue('');
    } catch {
      setErrorAndTimeout('Unable to add a todo');
    } finally {
      flushSync(() => {
        setTempTodo(null);
      });

      inputRef.current?.focus();
    }
  }

  async function handleRemoveAllCompletedTodos() {
    todos
      .filter(todo => todo.completed)
      .map(todo => todo.id)
      .forEach(currentTodo => {
        handleTodoRemove(currentTodo);
      });
  }

  useEffect(() => {
    getTodos()
      .then(todosFromServer => setTodos(todosFromServer))
      .catch(() => setErrorAndTimeout('Unable to load todos'));
  }, []);

  return (
    <div className="todoapp">
      <h1 className="todoapp__title">todos</h1>

      <div className="todoapp__content">
        <header className="todoapp__header">
          {todos.length !== 0 && (
            <button
              type="button"
              className={cn('todoapp__toggle-all', { active: false })}
              data-cy="ToggleAllButton"
            />
          )}

          <form onSubmit={event => handleAddTodo(event, searchInputValue)}>
            <input
              ref={inputRef}
              disabled={tempTodo !== null}
              onChange={event => setSearchInputValue(event.target.value)}
              value={searchInputValue}
              data-cy="NewTodoField"
              type="text"
              className="todoapp__new-todo"
              placeholder="What needs to be done?"
              autoFocus
            />
          </form>
        </header>

        <section className="todoapp__main" data-cy="TodoList">
          {getFilteredTodos().map((todo: Todo) => {
            return (
              <div
                onMouseEnter={() => setHoveredTodoId(todo.id)}
                onMouseLeave={() => setHoveredTodoId(null)}
                data-cy="Todo"
                className={cn('todo', todo.completed && 'completed')}
                key={todo.id}
              >
                {/* eslint-disable-next-line jsx-a11y/label-has-associated-control  */}
                <label
                  className="todo__status-label"
                  htmlFor={`todo-status-${todo.id}`}
                >
                  <input
                    onChange={() => {}}
                    data-cy="TodoStatus"
                    type="checkbox"
                    className="todo__status"
                    checked={todo.completed}
                    id={`todo-status-${todo.id}`}
                  />
                </label>

                {selectedTodoId === todo.id && (
                  <form onSubmit={event => event.preventDefault()}>
                    <input
                      onBlur={() => {
                        setSelectedTodoId(null);
                        setSelectedTodoValue('');
                      }}
                      data-cy="TodoTitleField"
                      type="text"
                      className="todo__title-field"
                      placeholder="Empty todo will be deleted"
                      value={selectedTodoValue}
                      onChange={event =>
                        setSelectedTodoValue(event.target.value)
                      }
                      autoFocus
                    />
                  </form>
                )}

                {selectedTodoId !== todo.id && (
                  <>
                    <span data-cy="TodoTitle" className="todo__title">
                      {todo.title}
                    </span>

                    <button
                      type="button"
                      className="todo__remove"
                      data-cy="TodoDelete"
                      onClick={() => handleTodoRemove(todo.id)}
                    >
                      ×
                    </button>
                  </>
                )}

                <div
                  data-cy="TodoLoader"
                  className={cn('modal overlay', {
                    'is-active': loadingTodoIds.includes(todo.id),
                  })}
                >
                  <div className="modal-background has-background-white-ter" />
                  <div className="loader" />
                </div>
              </div>
            );
          })}
        </section>

        {tempTodo !== null && (
          <div
            onMouseEnter={() => setHoveredTodoId(tempTodo.id)}
            onMouseLeave={() => setHoveredTodoId(null)}
            data-cy="Todo"
            className={cn('todo', tempTodo.completed && 'completed')}
            key={tempTodo.id}
          >
            {/* eslint-disable-next-line jsx-a11y/label-has-associated-control  */}
            <label
              className="todo__status-label"
              htmlFor={`temp-todo-status-${tempTodo.id}`}
            >
              <input
                onChange={() => {}}
                data-cy="TodoStatus"
                type="checkbox"
                className="todo__status"
                id={`temp-todo-status-${tempTodo.id}`}
              />
            </label>

            {selectedTodoId === tempTodo.id && (
              <form onSubmit={event => event.preventDefault()}>
                <input
                  onBlur={() => {
                    setSelectedTodoId(null);
                    setSelectedTodoValue('');
                  }}
                  data-cy="TodoTitleField"
                  type="text"
                  className="todo__title-field"
                  placeholder="Empty todo will be deleted"
                  value={selectedTodoValue}
                  onChange={event => setSelectedTodoValue(event.target.value)}
                  autoFocus
                />
              </form>
            )}

            {selectedTodoId !== tempTodo.id && (
              <>
                <span
                  data-cy="TodoTitle"
                  className="todo__title"
                  onDoubleClick={event => {
                    event.preventDefault();
                    setSelectedTodoId(tempTodo.id);
                    setSelectedTodoValue(tempTodo.title);
                  }}
                >
                  {tempTodo.title}
                </span>

                {hoveredTodoId === tempTodo.id && (
                  <button
                    type="button"
                    className="todo__remove"
                    data-cy="TodoDelete"
                    onClick={() => handleTodoRemove(tempTodo.id)}
                  >
                    ×
                  </button>
                )}
              </>
            )}

            <div
              data-cy="TodoLoader"
              className={cn('modal overlay', 'is-active')}
            >
              <div className="modal-background has-background-white-ter" />
              <div className="loader" />
            </div>
          </div>
        )}

        {todos.length !== 0 && (
          <footer className="todoapp__footer" data-cy="Footer">
            <span className="todo-count" data-cy="TodosCounter">
              {`${todos.filter(todo => !todo.completed).length} items left`}
            </span>

            <nav className="filter" data-cy="Filter">
              <a
                href="#/"
                className={cn(
                  'filter__link',
                  filterType === 'all' && 'selected',
                )}
                data-cy="FilterLinkAll"
                onClick={() => {
                  setFilterType('all');
                  getFilteredTodos();
                }}
              >
                All
              </a>

              <a
                href="#/active"
                className={cn(
                  'filter__link',
                  filterType === 'active' && 'selected',
                )}
                data-cy="FilterLinkActive"
                onClick={() => {
                  setFilterType('active');
                  getFilteredTodos();
                }}
              >
                Active
              </a>

              <a
                href="#/completed"
                className={cn(
                  'filter__link',
                  filterType === 'completed' && 'selected',
                )}
                data-cy="FilterLinkCompleted"
                onClick={() => {
                  setFilterType('completed');
                  getFilteredTodos();
                }}
              >
                Completed
              </a>
            </nav>

            <button
              disabled={!todos.some(todo => todo.completed)}
              onClick={() => handleRemoveAllCompletedTodos()}
              type="button"
              className="todoapp__clear-completed"
              data-cy="ClearCompletedButton"
            >
              Clear completed
            </button>
          </footer>
        )}
      </div>

      <div
        data-cy="ErrorNotification"
        className={cn(
          'notification',
          'is-danger',
          'is-light',
          'has-text-weight-normal',
          errorMessage === '' && 'hidden',
        )}
      >
        <button data-cy="HideErrorButton" type="button" className="delete" />

        {errorMessage.trim()}
      </div>
    </div>
  );
};
