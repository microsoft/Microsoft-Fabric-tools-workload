import React from "react";
import { Text } from "@fluentui/react-components";
import { 
  Table24Regular, 
  ChevronRight24Regular, 
  ChevronDown24Regular
} from "@fluentui/react-icons";
import { OneLakeTable, FabricTableItem } from "./ExcelTableEditorItemModel";
import { getItemTypeIcon } from "../PackageInstallerItem/components/UIHelper";

interface TreeItem {
  id: string;
  name: string;
  type: 'item' | 'table';
  fabricItem?: FabricTableItem;
  table?: OneLakeTable;
  children?: TreeItem[];
  isExpanded?: boolean;
}

interface ExcelTableEditorItemTreeNavigationProps {
  treeData: TreeItem[];
  expandedItems: Set<string>;
  selectedTable: OneLakeTable | null;
  onTreeItemClick: (item: TreeItem) => void;
}

export function ExcelTableEditorItemTreeNavigation({
  treeData,
  expandedItems,
  selectedTable,
  onTreeItemClick
}: ExcelTableEditorItemTreeNavigationProps) {

  const getTreeItemIcon = (item: TreeItem) => {
    switch (item.type) {
      case 'item': 
        return item.fabricItem?.type ? getItemTypeIcon(item.fabricItem.type) : getItemTypeIcon('unknown');
      case 'table': 
        return <Table24Regular />;
      default: 
        return getItemTypeIcon('unknown');
    }
  };

  const renderTreeItem = (item: TreeItem, level: number = 0): React.ReactNode => {
    const isExpanded = expandedItems.has(item.id);
    const hasChildren = item.children && item.children.length > 0;
    const isSelected = item.type === 'table' && selectedTable?.name === item.table?.name;
    
    const getExpandIcon = () => {
      if (!hasChildren) return <div style={{ width: '24px' }} />;
      return isExpanded ? <ChevronDown24Regular /> : <ChevronRight24Regular />;
    };

    return (
      <div key={item.id}>
        <div
          onClick={() => onTreeItemClick(item)}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '6px 8px',
            paddingLeft: `${level * 20 + 8}px`,
            cursor: 'pointer',
            backgroundColor: isSelected ? '#f3f9ff' : 'transparent',
            border: isSelected ? '1px solid #0078d4' : '1px solid transparent',
            borderRadius: '4px',
            marginBottom: '2px'
          }}
          onMouseEnter={(e) => {
            if (!isSelected) {
              e.currentTarget.style.backgroundColor = '#f8f9fa';
            }
          }}
          onMouseLeave={(e) => {
            if (!isSelected) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          {getExpandIcon()}
          <div style={{ marginLeft: '4px', marginRight: '8px' }}>
            {getTreeItemIcon(item)}
          </div>
          <Text style={{ fontSize: '14px', flex: 1 }}>
            {item.name}
          </Text>
        </div>
        
        {isExpanded && hasChildren && (
          <div>
            {item.children!.map(child => renderTreeItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ 
      width: "300px", 
      minWidth: "300px",
      flexShrink: 0,
      borderRight: "1px solid #e1dfdd", 
      padding: "16px",
      overflowY: "auto",
      backgroundColor: "#fafafa"
    }}>
      <Text style={{ fontWeight: "600", fontSize: "18px", marginBottom: "16px", display: "block" }}>
        Data Sources
      </Text>
      
      <div>
        {treeData.map(item => renderTreeItem(item))}
      </div>
    </div>
  );
}

export type { TreeItem };