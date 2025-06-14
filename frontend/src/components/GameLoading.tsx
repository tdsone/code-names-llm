import search from './assets/search.svg'
export function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen relative bg-gradient-to-b from-[#F05F4533] to-[#6294D833]">
      <img src={search} alt="Loading" className="animate-spin h-20 w-20 text-indigo-600" />
      <p className="mt-4 text-lg text-[#6294D8] dark:text-gray-200">Thinking of the best set of words for your game...</p>
    </div>
  );
}
