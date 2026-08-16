type RevealOptions = {
    delay?: number;
    distance?: number;
};

export const reveal = (
    node: HTMLElement,
    { delay = 0, distance = 28 }: RevealOptions = {},
) => {
    node.style.setProperty("--reveal-delay", `${delay}ms`);
    node.style.setProperty("--reveal-distance", `${distance}px`);

    if (!window.IntersectionObserver) {
        node.dataset.reveal = "visible";
        return {};
    }

    node.dataset.reveal = "ready";

    const observer = new IntersectionObserver(
        ([entry]) => {
            if (entry.isIntersecting) {
                node.dataset.reveal = "visible";
                observer.disconnect();
            }
        },
        { rootMargin: "0px 0px -8%", threshold: 0.12 },
    );

    observer.observe(node);

    return {
        destroy: () => observer.disconnect(),
    };
};
