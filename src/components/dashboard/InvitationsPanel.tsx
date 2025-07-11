import React, { useState, useEffect } from 'react';
import { Mail, Check, X, Clock, Users, Calendar, User, Building } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useNotification } from '../../hooks/useNotification';
import { getUserInvitations, acceptInvitation, declineInvitation } from '../../lib/firebase';

interface ProjectInvitation {
  id: string;
  project_id: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  invited_by: string;
  expires_at: Date;
  created_at: Date;
  project?: {
    id: string;
    title: string;
    description?: string;
  };
  inviter?: {
    id: string;
    email: string;
    full_name?: string;
  };
}

const InvitationsPanel: React.FC = () => {
  const { user } = useAuthStore();
  const { showNotification } = useNotification();
  
  const [invitations, setInvitations] = useState<ProjectInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingInvite, setProcessingInvite] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadInvitations();
    }
  }, [user]);

  const loadInvitations = async () => {
    setLoading(true);
    try {
      const { data, error } = await getUserInvitations();
      if (error) throw error;
      setInvitations(data || []);
    } catch (error) {
      console.error('Load invitations error:', error);
      showNotification('Failed to load invitations', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async (invitationId: string, projectTitle: string) => {
    setProcessingInvite(invitationId);
    try {
      const { error } = await acceptInvitation(invitationId);
      
      if (error) {
        showNotification(error.message || 'Failed to accept invitation', 'error');
      } else {
        showNotification(`Successfully joined "${projectTitle}"!`, 'success');
        // Remove the accepted invitation from the list
        setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
        
        // Refresh projects in the project store
        const { useProjectStore } = await import('../../store/projectStore');
        useProjectStore.getState().fetchProjects();
      }
    } catch (error) {
      showNotification('Failed to accept invitation', 'error');
    } finally {
      setProcessingInvite(null);
    }
  };

  const handleDeclineInvitation = async (invitationId: string, projectTitle: string) => {
    if (!confirm(`Are you sure you want to decline the invitation to join "${projectTitle}"?`)) {
      return;
    }

    setProcessingInvite(invitationId);
    try {
      const { error } = await declineInvitation(invitationId);
      
      if (error) {
        showNotification(error.message || 'Failed to decline invitation', 'error');
      } else {
        showNotification('Invitation declined', 'success');
        // Remove the declined invitation from the list
        setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
      }
    } catch (error) {
      showNotification('Failed to decline invitation', 'error');
    } finally {
      setProcessingInvite(null);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-blue-100 text-blue-800';
      case 'editor':
        return 'bg-green-100 text-green-800';
      case 'viewer':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Users className="w-4 h-4" />;
      case 'editor':
        return <User className="w-4 h-4" />;
      case 'viewer':
        return <User className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  const formatTimeRemaining = (expiresAt: Date) => {
    const now = new Date();
    const timeLeft = expiresAt.getTime() - now.getTime();
    const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24));
    
    if (daysLeft <= 0) return 'Expired';
    if (daysLeft === 1) return '1 day left';
    return `${daysLeft} days left`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg">
            <Mail className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Project Invitations</h2>
        </div>
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg">
            <Mail className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Project Invitations</h2>
            <p className="text-sm text-gray-600">Join projects you've been invited to</p>
          </div>
        </div>
        {invitations.length > 0 && (
          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
            {invitations.length} pending
          </span>
        )}
      </div>

      {invitations.length === 0 ? (
        <div className="text-center py-12">
          <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No pending invitations</h3>
          <p className="text-gray-600">
            When someone invites you to join their project, invitations will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {invitations.map((invitation) => (
            <div 
              key={invitation.id} 
              className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start space-x-4">
                    <div className="p-3 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg flex-shrink-0">
                      <Building className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate">
                        {invitation.project?.title || 'Unknown Project'}
                      </h3>
                      {invitation.project?.description && (
                        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                          {invitation.project.description}
                        </p>
                      )}
                      
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <User className="w-4 h-4" />
                          <span>
                            Invited by {invitation.inviter?.full_name || invitation.inviter?.email || 'Unknown'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>{invitation.created_at.toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span className={`${
                            formatTimeRemaining(invitation.expires_at) === 'Expired' 
                              ? 'text-red-600' 
                              : formatTimeRemaining(invitation.expires_at).includes('1 day')
                                ? 'text-orange-600'
                                : 'text-gray-600'
                          }`}>
                            {formatTimeRemaining(invitation.expires_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-3 lg:ml-6">
                  <div className="flex items-center justify-center sm:justify-start">
                    <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium ${getRoleBadgeColor(invitation.role)}`}>
                      {getRoleIcon(invitation.role)}
                      <span className="capitalize">{invitation.role}</span>
                    </span>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleDeclineInvitation(invitation.id, invitation.project?.title || 'Unknown Project')}
                      disabled={processingInvite === invitation.id}
                      className="flex-1 sm:flex-none px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                      <X className="w-4 h-4" />
                      <span>Decline</span>
                    </button>
                    <button
                      onClick={() => handleAcceptInvitation(invitation.id, invitation.project?.title || 'Unknown Project')}
                      disabled={processingInvite === invitation.id || formatTimeRemaining(invitation.expires_at) === 'Expired'}
                      className="flex-1 sm:flex-none px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2"
                    >
                      {processingInvite === invitation.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Joining...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Accept</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default InvitationsPanel;