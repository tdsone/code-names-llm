import search from './assets/search.svg'
export function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <img src={search} alt="Loading" className="animate-spin h-12 w-12 text-indigo-600" />
      <p className="mt-4 text-lg text-gray-700 dark:text-gray-200">AI is thinking of the best set of words for your game...</p>
    </div>
  );
}
