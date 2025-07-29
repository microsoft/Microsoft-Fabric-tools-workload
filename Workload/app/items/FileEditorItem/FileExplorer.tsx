import React from "react";
import {
  Button,
} from "@fluentui/react-components";
import { ChevronDoubleLeft20Regular, ChevronDoubleRight20Regular } from "@fluentui/react-icons";
import "../../styles.scss";
import { OneLakeItemExplorerComponent, OneLakeItemExplorerComponentProps } from "../../samples/views/SampleOneLakeItemExplorer/SampleOneLakeItemExplorer";

interface FileExplorerProps extends OneLakeItemExplorerComponentProps {
  isVisible: boolean;
  onToggleVisibility: () => void;
}

export function FileExplorer(props: FileExplorerProps) {

  return (
    <div className={`explorer ${props.isVisible ? "" : "hidden-explorer"}`} style={{
      height: "100%",
      margin: 0,
      borderRadius: 0,
      borderRight: "1px solid #e1dfdd",
      boxShadow: "none"
    }}>
      <div className={`top ${props.isVisible ? "" : "vertical-text"}`}>
        {!props.isVisible && (
          <Button onClick={props.onToggleVisibility} appearance="subtle" icon={<ChevronDoubleRight20Regular />}></Button>
        )}
        <h1>File Explorer</h1>
        {props.isVisible && (
          <Button onClick={props.onToggleVisibility} appearance="subtle" icon={<ChevronDoubleLeft20Regular />}></Button>
        )}
      </div>

      {props.isVisible && (
        <div style={{ height: "calc(100% - 60px)", overflow: "hidden" }}>
          <OneLakeItemExplorerComponent
            workloadClient={props.workloadClient}
            onFileSelected={props.onFileSelected}
            onTableSelected={props.onTableSelected}
            initialItem={props.initialItem}
            onItemChanged={props.onItemChanged}
          />
        </div>
      )}
    </div>
  );
}
