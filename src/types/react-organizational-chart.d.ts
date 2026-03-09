declare module "react-organizational-chart" {
  import * as React from "react";

  interface TreeProps {
    label: React.ReactNode;
    lineWidth?: string;
    lineColor?: string;
    lineBorderRadius?: string;
    nodePadding?: string;
    children?: React.ReactNode;
  }

  interface TreeNodeProps {
    label: React.ReactNode;
    children?: React.ReactNode;
  }

  export const Tree: React.FC<TreeProps>;
  export const TreeNode: React.FC<TreeNodeProps>;
}
