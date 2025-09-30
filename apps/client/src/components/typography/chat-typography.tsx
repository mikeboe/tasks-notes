type HeadlineProps = {
    children: React.ReactNode;
    green?: boolean;
    contrast?: boolean;
};

type ListProps = {
    children: React.ReactNode;
};

const ChatH1 = ({ children }: HeadlineProps) => {
    return (
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
            {children}
        </h1>
    );
};

const ChatH2 = ({ children }: HeadlineProps) => {
    return (
        <h2 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white sm:text-2xl">
            {children}
        </h2>
    );
};

const ChatH3 = ({ children }: HeadlineProps) => {
    return (
        <h2 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white sm:text-xl">
            {children}
        </h2>
    );
};

const ChatH4 = ({ children }: HeadlineProps) => {
    return (
        <h2 className="text-base font-semibold tracking-tight text-gray-900 dark:text-white sm:text-lg">
            {children}
        </h2>
    );
};

const ChatP = ({ children, green, contrast }: HeadlineProps) => {
    return (
        <p
            className={`text-base leading-8 ${green ? 'text-green-700' : contrast ? 'text-gray-700 dark:text-gray-700' : 'text-gray-600 dark:text-gray-400 mb-2'}`}
        >
            {children}
        </p>
    );
};

// const ParagraphSmall = ({ children }: HeadlineProps) => {
//   return (
//     <p className="mt-6 text-sm leading-8 text-gray-600 dark:text-gray-400">
//       {children}
//     </p>
//   );
// };

const ChatOl = ({ children }: ListProps) => {
    return (
        <ol className="mt-6 pl-10 list-decimal list-inside text-base leading-8 text-gray-600 dark:text-gray-400">
            {children}
        </ol>
    );
};



const ChatUl = ({ children }: ListProps) => {
    return (
        <ul className="mt-6 pl-10 list-disc list-inside text-base leading-8 text-gray-600 dark:text-gray-400">
            {children}
        </ul>
    );
};

const ChatB = ({ children }: ListProps) => {
    return <span className="font-semibold">{children}</span>;
};

export {
    ChatH1,
    ChatH2,
    ChatH3,
    ChatH4,
    ChatP,
    ChatOl,
    ChatUl,
    ChatB
};
