import LinkifyIt from "linkify-it";
import type { Link, Parent, PhrasingContent, Root, Text } from "mdast";
import { visitParents } from "unist-util-visit-parents";

const linkify = new LinkifyIt();

const SKIP_ANCESTOR_TYPES = new Set([
  "link",
  "linkReference",
  "image",
  "imageReference",
  "code",
  "inlineCode",
  "html",
]);

function shouldSkip(ancestors: unknown[]): boolean {
  for (const a of ancestors) {
    if (!a || typeof a !== "object") continue;
    const t = (a as { type?: string }).type;
    if (t && SKIP_ANCESTOR_TYPES.has(t)) return true;
  }
  return false;
}

/**
 * Turn bare URLs in markdown text (that GFM autolink missed) into mdast links.
 * Runs after remark-gfm so we only augment remaining text nodes.
 */
export function remarkLinkifyBareUrls() {
  return (tree: Root) => {
    const jobs: { parent: Parent; index: number; nodes: PhrasingContent[] }[] = [];

    visitParents(tree, "text", (node: Text, ancestors) => {
      if (!node.value || shouldSkip(ancestors)) return;

      const matches = linkify.match(node.value);
      if (!matches?.length) return;

      const parent = ancestors[ancestors.length - 1] as Parent;
      const index = parent.children.indexOf(node);
      if (index === -1) return;

      let last = 0;
      const out: PhrasingContent[] = [];
      for (const m of matches) {
        if (m.index > last) {
          out.push({ type: "text", value: node.value.slice(last, m.index) });
        }
        const label = node.value.slice(m.index, m.lastIndex);
        const link: Link = {
          type: "link",
          url: m.url,
          children: [{ type: "text", value: label }],
        };
        out.push(link);
        last = m.lastIndex;
      }
      if (last < node.value.length) {
        out.push({ type: "text", value: node.value.slice(last) });
      }

      jobs.push({ parent, index, nodes: out });
    });

    jobs.sort((a, b) => {
      if (a.parent !== b.parent) return 0;
      return b.index - a.index;
    });
    for (const { parent, index, nodes } of jobs) {
      parent.children.splice(index, 1, ...nodes);
    }
  };
}
