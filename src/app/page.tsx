export default function Home() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-8">
      <div className="max-w-2xl mx-auto text-center">
        {/* Main heading */}
        <h1 className="text-6xl font-bold text-black mb-8 tracking-tight">
          github.gg
        </h1>
        
        {/* Under construction message */}
        <p className="text-xl text-gray-600 mb-12 leading-relaxed">
          We&apos;re building something amazing. 
          <br />
          Stay tuned.
        </p>
        
        {/* Roadmap section */}
        <div className="text-left max-w-lg mx-auto">
          <h2 className="text-lg font-semibold text-black mb-6 uppercase tracking-wide">
            Roadmap
          </h2>
          
          <ul className="space-y-3 text-gray-700">
            <li className="flex items-start">
              <span className="w-2 h-2 bg-black rounded-full mt-2 mr-4 flex-shrink-0"></span>
              <span>GitHub repository analysis & insights</span>
            </li>
            <li className="flex items-start">
              <span className="w-2 h-2 bg-black rounded-full mt-2 mr-4 flex-shrink-0"></span>
              <span>Code quality metrics & recommendations</span>
            </li>
            <li className="flex items-start">
              <span className="w-2 h-2 bg-black rounded-full mt-2 mr-4 flex-shrink-0"></span>
              <span>Collaboration analytics & team insights</span>
            </li>
            <li className="flex items-start">
              <span className="w-2 h-2 bg-black rounded-full mt-2 mr-4 flex-shrink-0"></span>
              <span>Performance optimization suggestions</span>
            </li>
            <li className="flex items-start">
              <span className="w-2 h-2 bg-black rounded-full mt-2 mr-4 flex-shrink-0"></span>
              <span>Security vulnerability scanning</span>
            </li>
          </ul>
        </div>
        
        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Built with Next.js • TypeScript • Tailwind CSS
          </p>
        </div>
      </div>
    </div>
  );
}
