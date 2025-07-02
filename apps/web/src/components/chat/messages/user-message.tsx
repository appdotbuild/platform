export function UserMessage({ message }: { message: string }) {
  return (
    <div className="bg-gray-100 border border-[#E4E4E7] px-4 pt-2 pb-4 rounded-lg">
      <span className="font-bold text-gray-500 text-sm"> User </span>
      <div className="w-full border border-b border-gray-200 mt-1 mb-4"></div>
      <span className="text-gray-500">{message}</span>
    </div>
  );
}
