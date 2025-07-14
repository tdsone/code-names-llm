import { useState, Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Button } from "./ui/button";
import { Rules } from "./Rules";
import { About } from "./About";
import Clu3Logo from "../assets/Clu3.svg";

export default function Header() {
  const [showRules, setShowRules]   = useState(false);
  const [showAbout, setShowAbout]   = useState(false);

  return (
    <>
      {/* Top bar */}
      <header className="w-full flex items-center justify-between py-3 px-4 sm:px-6 bg-white dark:bg-gray-900 shadow-md rounded-lg">
        <img src={Clu3Logo} alt="Clu3 Logo" className="lg:h-10 h-4 w-auto flex-shrink-0" />

        <div className="flex items-center gap-2 sm:gap-3">
          <Button variant="ghost" onClick={() => setShowRules(true)}>
            Rules
          </Button>

          <Button variant="ghost" onClick={() => setShowAbout(true)}>
            About
          </Button>

          <a
            href="https://coff.ee/juliakzl"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="ghost">
              <span className="hidden sm:inline">Cover&nbsp;my&nbsp;openAI&nbsp;costs</span>
              <span className="sm:hidden">☕</span>
            </Button>
          </a>
        </div>
      </header>

      {/* Rules modal */}
      <Transition appear show={showRules} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setShowRules(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/40" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-start justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-200"
                enterFrom="scale-95 opacity-0"
                enterTo="scale-100 opacity-100"
                leave="ease-in duration-150"
                leaveFrom="scale-100 opacity-100"
                leaveTo="scale-95 opacity-0"
              >
                <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 p-6 shadow-xl transition-all">
                  <Rules />
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* About modal */}
      <Transition appear show={showAbout} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setShowAbout(false)}>
          {/* identical overlay + animation */}
          <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
            leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black/40" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-start justify-center p-4">
              <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="scale-95 opacity-0"
                enterTo="scale-100 opacity-100" leave="ease-in duration-150" leaveFrom="scale-100 opacity-100"
                leaveTo="scale-95 opacity-0">
                <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 p-6 shadow-xl transition-all">
                  <About />
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}