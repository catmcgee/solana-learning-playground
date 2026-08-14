import { FC, useEffect } from "react";
import remarkGfm from "remark-gfm";

import CodeBlock from "../CodeBlock";
import Img from "../Img";
import Link, { LinkProps } from "../Link";
import { HyperLink } from "../Icons";
import { PgCommon, PgRouter } from "../../utils";
import { HeaderWrapper, StyledMarkdown } from "./Markdown.styles";

export interface MarkdownProps {
  /** Markdown string */
  children: string;
  /** Make all fonts the code font */
  codeFontOnly?: boolean;
  /** Root for the `src` prop (defaults to the current path) */
  rootSrc?: string;
  /** Whether to support URL hashes `<URL>#<HASH>` */
  linkable?: boolean;
}

const Markdown: FC<MarkdownProps> = ({ rootSrc, linkable, ...props }) => {
  // Scroll to section if it's linkable
  useEffect(() => {
    if (!linkable) return;

    /** Recursively try to find a parent vertically scrollable element. */
    const findParentScrollableElement = (
      element: HTMLElement | null
    ): HTMLElement | null => {
      if (!element) return null;
      if (element.scrollHeight > element.clientHeight) return element;
      return findParentScrollableElement(element.parentElement);
    };

    const { dispose } = PgRouter.onDidChangeHash((hash) => {
      if (!hash) return;

      const el = document.getElementById(
        HEADER_ELEMENT_ID_PREFIX + hash.substring(1)
      );
      if (!el) return;

      setTimeout(() => {
        const scrollableEl = findParentScrollableElement(el);
        if (!scrollableEl) return;

        scrollableEl.scrollTo({
          top: el.getBoundingClientRect().top + scrollableEl.scrollTop,
          behavior: "smooth",
        });
      });
    });
    return dispose;
  }, [linkable]);

  return (
    <StyledMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        /** Links */
        a: (props) => <Link {...(props as LinkProps)} />,

        /** Images */
        img: (props) => {
          return (
            <Img
              {...props}
              src={
                props.src && !props.src.startsWith("/")
                  ? PgCommon.joinPaths(
                      rootSrc ?? PgRouter.location.pathname,
                      props.src
                    )
                  : props.src
              }
            />
          );
        },

        /** Code blocks */
        pre: (props) => {
          const codeProps = (props as any).children[0].props;
          const lang = codeProps.className?.split("-")?.at(1);
          const code = codeProps.children[0];

          return <CodeBlock lang={lang}>{code}</CodeBlock>;
        },

        /** Section headers */
        h1: (props) => <Header element="h1" linkable={linkable} {...props} />,
        h2: (props) => <Header element="h2" linkable={linkable} {...props} />,
        h3: (props) => <Header element="h3" linkable={linkable} {...props} />,
      }}
      {...props}
    />
  );
};

type HeaderProps = {
  element: "h1" | "h2" | "h3";
} & Pick<MarkdownProps, "linkable">;

const Header: FC<HeaderProps> = ({ element: H, linkable, ...rest }) => {
  if (!linkable) return <H {...rest} />;

  const hash = PgCommon.toKebabFromTitle((rest.children as string[])[0]);

  return (
    <HeaderWrapper onClick={() => (PgRouter.location.hash = hash)}>
      <HyperLink />
      <H {...rest} id={HEADER_ELEMENT_ID_PREFIX + hash} />
    </HeaderWrapper>
  );
};

const HEADER_ELEMENT_ID_PREFIX = "md";

export default Markdown;
