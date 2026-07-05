/**
 * Entity Tree View Component
 * عرض شجري للكيانات المؤسسية
 */

import { useState } from 'react';
import { ChevronDown, ChevronRight, Building2, Users, Briefcase, FileText, Plus, MoreVertical } from 'lucide-react';
import { EntityTreeNode, EntityType, EntityStatus } from '../../types/entity';

interface EntityTreeViewProps {
  rootEntityId?: string;
  expandLevel?: number;
  showActions?: boolean;
  draggable?: boolean;
  onNodeClick?: (entity: EntityTreeNode) => void;
  onDragDrop?: (draggedId: string, targetId: string) => void;
}

export function EntityTreeView({
  rootEntityId,
  expandLevel = 2,
  showActions = true,
  draggable = false,
  onNodeClick,
  onDragDrop,
}: EntityTreeViewProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);

  // Mock data - Replace with real data from API
  const mockEntities: EntityTreeNode[] = [
    {
      entityId: '1',
      unifiedCode: 'YE-MOL-001',
      registrationNumber: 'REG-001',
      entityType: 'federation',
      classification: 'labor',
      legalForm: 'federation',
      establishmentDate: new Date('2020-01-01'),
      registrationDate: new Date('2020-01-15'),
      status: 'active',
      complianceStatus: 'compliant',
      riskLevel: 'low',
      nameAr: 'الاتحاد العام لنقابات العمال',
      nameEn: 'General Federation of Trade Unions',
      contactInfo: {
        phone: '+967-1-234567',
        email: 'info@gftu.ye',
      },
      address: {
        governorate: 'أمانة العاصمة',
        city: 'صنعاء',
      },
      president: {
        fullName: 'أحمد محمد علي',
        nationalId: '01011234567',
        position: 'رئيس الاتحاد',
        appointmentDate: new Date('2020-01-01'),
      },
      memberCount: 50000,
      branchCount: 15,
      committeeCount: 8,
      nextRenewalDate: new Date('2026-12-31'),
      renewalStatus: 'current',
      documents: [],
      licenses: [],
      createdAt: new Date('2020-01-15'),
      createdBy: 'system',
      updatedAt: new Date('2026-05-17'),
      updatedBy: 'admin',
      version: 1,
      children: [
        {
          entityId: '2',
          unifiedCode: 'YE-MOL-002',
          registrationNumber: 'REG-002',
          entityType: 'union',
          classification: 'labor',
          sector: 'construction',
          legalForm: 'syndicate',
          establishmentDate: new Date('2021-03-01'),
          registrationDate: new Date('2021-03-15'),
          status: 'active',
          complianceStatus: 'compliant',
          riskLevel: 'low',
          nameAr: 'نقابة عمال البناء والتشييد',
          nameEn: 'Construction Workers Union',
          parentEntityId: '1',
          contactInfo: {
            phone: '+967-1-345678',
            email: 'info@construction-union.ye',
          },
          address: {
            governorate: 'أمانة العاصمة',
            city: 'صنعاء',
          },
          president: {
            fullName: 'محمد أحمد حسن',
            nationalId: '01011234568',
            position: 'رئيس النقابة',
            appointmentDate: new Date('2021-03-01'),
          },
          memberCount: 5000,
          branchCount: 5,
          committeeCount: 3,
          nextRenewalDate: new Date('2027-03-15'),
          renewalStatus: 'current',
          documents: [],
          licenses: [],
          createdAt: new Date('2021-03-15'),
          createdBy: 'admin',
          updatedAt: new Date('2026-05-17'),
          updatedBy: 'admin',
          version: 1,
          children: [
            {
              entityId: '3',
              unifiedCode: 'YE-MOL-003',
              registrationNumber: 'REG-003',
              entityType: 'branch',
              classification: 'labor',
              sector: 'construction',
              legalForm: 'syndicate',
              establishmentDate: new Date('2022-01-01'),
              registrationDate: new Date('2022-01-15'),
              status: 'active',
              complianceStatus: 'compliant',
              riskLevel: 'low',
              nameAr: 'فرع نقابة عمال البناء - صنعاء',
              nameEn: 'Construction Workers Union - Sanaa Branch',
              parentEntityId: '2',
              contactInfo: {
                phone: '+967-1-456789',
                email: 'sanaa@construction-union.ye',
              },
              address: {
                governorate: 'أمانة العاصمة',
                city: 'صنعاء',
                directorate: 'التحرير',
              },
              president: {
                fullName: 'علي حسن محمد',
                nationalId: '01011234569',
                position: 'رئيس الفرع',
                appointmentDate: new Date('2022-01-01'),
              },
              memberCount: 1200,
              branchCount: 0,
              committeeCount: 2,
              nextRenewalDate: new Date('2028-01-15'),
              renewalStatus: 'current',
              documents: [],
              licenses: [],
              createdAt: new Date('2022-01-15'),
              createdBy: 'admin',
              updatedAt: new Date('2026-05-17'),
              updatedBy: 'admin',
              version: 1,
            },
          ],
        },
        {
          entityId: '4',
          unifiedCode: 'YE-MOL-004',
          registrationNumber: 'REG-004',
          entityType: 'union',
          classification: 'professional',
          sector: 'healthcare',
          legalForm: 'syndicate',
          establishmentDate: new Date('2019-06-01'),
          registrationDate: new Date('2019-06-15'),
          status: 'active',
          complianceStatus: 'compliant',
          riskLevel: 'low',
          nameAr: 'نقابة الأطباء',
          nameEn: 'Doctors Syndicate',
          parentEntityId: '1',
          contactInfo: {
            phone: '+967-1-567890',
            email: 'info@doctors-syndicate.ye',
          },
          address: {
            governorate: 'أمانة العاصمة',
            city: 'صنعاء',
          },
          president: {
            fullName: 'د. فاطمة أحمد علي',
            nationalId: '01011234570',
            position: 'نقيب الأطباء',
            appointmentDate: new Date('2019-06-01'),
          },
          memberCount: 3500,
          branchCount: 8,
          committeeCount: 5,
          nextRenewalDate: new Date('2026-06-15'),
          renewalStatus: 'due_soon',
          documents: [],
          licenses: [],
          createdAt: new Date('2019-06-15'),
          createdBy: 'admin',
          updatedAt: new Date('2026-05-17'),
          updatedBy: 'admin',
          version: 1,
        },
      ],
    },
  ];

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const handleNodeClick = (entity: EntityTreeNode) => {
    setSelectedNode(entity.entityId);
    onNodeClick?.(entity);
  };

  const handleDragStart = (e: React.DragEvent, nodeId: string) => {
    if (!draggable) return;
    setDraggedNode(nodeId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!draggable) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    if (!draggable || !draggedNode) return;
    e.preventDefault();
    onDragDrop?.(draggedNode, targetId);
    setDraggedNode(null);
  };

  const getEntityIcon = (entityType: EntityType) => {
    switch (entityType) {
      case 'federation':
      case 'union':
        return <Building2 className="h-4 w-4" />;
      case 'branch':
        return <Briefcase className="h-4 w-4" />;
      case 'committee':
        return <Users className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: EntityStatus) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-50';
      case 'suspended':
        return 'text-yellow-600 bg-yellow-50';
      case 'inactive':
        return 'text-gray-600 bg-gray-50';
      case 'dissolved':
        return 'text-red-600 bg-red-50';
      case 'under_review':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const renderTreeNode = (entity: EntityTreeNode, level: number = 0) => {
    const isExpanded = expandedNodes.has(entity.entityId);
    const hasChildren = entity.children && entity.children.length > 0;
    const isSelected = selectedNode === entity.entityId;
    const isDragging = draggedNode === entity.entityId;

    return (
      <div key={entity.entityId} className="select-none">
        <div
          className={`
            flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded-lg cursor-pointer
            transition-colors duration-150
            ${isSelected ? 'bg-blue-50 border border-blue-200' : ''}
            ${isDragging ? 'opacity-50' : ''}
          `}
          style={{ paddingRight: `${level * 24}px` }}
          onClick={() => handleNodeClick(entity)}
          draggable={draggable}
          onDragStart={(e) => handleDragStart(e, entity.entityId)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, entity.entityId)}
        >
          {/* Expand/Collapse Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (hasChildren) toggleNode(entity.entityId);
            }}
            className="p-1 hover:bg-gray-200 rounded"
          >
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-600" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-600" />
              )
            ) : (
              <div className="h-4 w-4" />
            )}
          </button>

          {/* Entity Icon */}
          <div className={`p-2 rounded ${getStatusColor(entity.status)}`}>
            {getEntityIcon(entity.entityType)}
          </div>

          {/* Entity Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 truncate">
                {entity.nameAr}
              </span>
              <span className="text-xs text-gray-500">
                {entity.unifiedCode}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
              <span>الأعضاء: {entity.memberCount.toLocaleString()}</span>
              {entity.branchCount > 0 && (
                <span>الفروع: {entity.branchCount}</span>
              )}
              {entity.committeeCount > 0 && (
                <span>اللجان: {entity.committeeCount}</span>
              )}
            </div>
          </div>

          {/* Status Badge */}
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(entity.status)}`}>
            {entity.status === 'active' && 'نشط'}
            {entity.status === 'suspended' && 'معلق'}
            {entity.status === 'inactive' && 'متوقف'}
            {entity.status === 'dissolved' && 'منحل'}
            {entity.status === 'under_review' && 'تحت المراجعة'}
          </div>

          {/* Actions Menu */}
          {showActions && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Handle actions menu
              }}
              className="p-1 hover:bg-gray-200 rounded"
            >
              <MoreVertical className="h-4 w-4 text-gray-600" />
            </button>
          )}
        </div>

        {/* Children */}
        {isExpanded && hasChildren && (
          <div className="mr-6 border-r border-gray-200">
            {entity.children?.map((child) => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b">
        <h3 className="text-lg font-semibold text-gray-900">
          الهيكل التنظيمي
        </h3>
        {showActions && (
          <button className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Plus className="h-4 w-4" />
            <span>إضافة كيان</span>
          </button>
        )}
      </div>

      {/* Tree */}
      <div className="space-y-1">
        {mockEntities.map((entity) => renderTreeNode(entity))}
      </div>

      {/* Empty State */}
      {mockEntities.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p>لا توجد كيانات مسجلة</p>
        </div>
      )}
    </div>
  );
}
