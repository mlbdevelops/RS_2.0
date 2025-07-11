import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut as firebaseSignOut, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, updateDoc, collection, addDoc, getDocs, query, where, orderBy, limit, deleteDoc, increment, serverTimestamp, Timestamp, count, getCountFromServer } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDX01rPKB8ybQUsduPgboUJ1gj8-2zxVr0",
  authDomain: "seoforge-99a21.firebaseapp.com",
  projectId: "seoforge-99a21",
  storageBucket: "seoforge-99a21.firebasestorage.app",
  messagingSenderId: "446549228666",
  appId: "1:446549228666:web:a8e75fc3b0bf35c2b40fc3",
  measurementId: "G-XJR0RM785T"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Database types
export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  subscription_tier: 'free' | 'pro' | 'enterprise';
  usage_count: number;
  usage_limit: number;
  created_at: Date;
  updated_at: Date;
}

export interface Project {
  id: string;
  user_id: string;
  owner_id: string;
  title: string;
  description?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Article {
  id: string;
  project_id: string;
  title: string;
  content: string;
  seo_score?: number;
  keywords?: string[];
  meta_description?: string;
  created_at: Date;
  updated_at: Date;
}

export interface ContentBrief {
  id: string;
  project_id?: string;
  user_id: string;
  title: string;
  topic: string;
  target_audience: string;
  content_outline: string[];
  key_points: string[];
  tone_style: string;
  word_count: string;
  target_keywords: string[];
  seo_tips: string[];
  created_at: Date;
  updated_at: Date;
}

export interface TeamMember {
  id: string;
  user_id: string;
  project_id: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  invited_by?: string;
  status: 'pending' | 'active' | 'inactive';
  created_at: Date;
  updated_at: Date;
  user?: {
    id: string;
    email: string;
    full_name?: string;
  };
}

export interface ProjectInvitation {
  id: string;
  project_id: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  invited_by: string;
  token: string;
  expires_at: Date;
  accepted_at?: Date;
  created_at: Date;
}

export interface ArticleComment {
  id: string;
  article_id: string;
  user_id: string;
  content: string;
  position?: any;
  resolved: boolean;
  created_at: Date;
  updated_at: Date;
  user?: {
    id: string;
    email: string;
    full_name?: string;
  };
}

export interface ActivityLog {
  id: string;
  project_id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  metadata: any;
  created_at: Date;
  user?: {
    id: string;
    email: string;
    full_name?: string;
  };
}

export interface UserStats {
  totalProjects: number;
  totalArticles: number;
  totalBriefs: number;
  usageCount: number;
  usageLimit: number;
}

// Auth helpers
export const signUp = async (email: string, password: string, fullName?: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Create user profile in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      id: user.uid,
      email: user.email,
      full_name: fullName || '',
      subscription_tier: 'free',
      usage_count: 0,
      usage_limit: 10,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    });

    return { data: { user }, error: null };
  } catch (error) {
    console.error('Signup error:', error);
    return { data: null, error };
  }
};

export const signIn = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { data: { user: userCredential.user }, error: null };
  } catch (error) {
    console.error('Signin error:', error);
    return { data: null, error };
  }
};

export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
    return { error: null };
  } catch (error) {
    return { error };
  }
};

export const getCurrentUser = () => {
  return auth.currentUser;
};

// Database operations
export const createProject = async (title: string, description?: string) => {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const projectData = {
      user_id: user.uid,
      owner_id: user.uid,
      title,
      description: description || '',
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'projects'), projectData);
    
    // Create team member entry for owner
    await addDoc(collection(db, 'team_members'), {
      user_id: user.uid,
      project_id: docRef.id,
      role: 'owner',
      status: 'active',
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    });

    // Log activity
    await logActivity(docRef.id, 'created', 'project', docRef.id, { title });

    const project = { id: docRef.id, ...projectData };
    return { data: project, error: null };
  } catch (error) {
    console.error('Create project error:', error);
    return { data: null, error };
  }
};

export const getUserProjects = async () => {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    // Get team memberships
    const teamMembersQuery = query(
      collection(db, 'team_members'),
      where('user_id', '==', user.uid),
      where('status', '==', 'active')
    );
    const teamMembersSnapshot = await getDocs(teamMembersQuery);
    const projectIds = teamMembersSnapshot.docs.map(doc => doc.data().project_id);

    if (projectIds.length === 0) {
      return { data: [], error: null };
    }

    // Get projects in batches (Firestore 'in' query limit is 10)
    const projects = [];
    for (let i = 0; i < projectIds.length; i += 10) {
      const batch = projectIds.slice(i, i + 10);
      const projectsQuery = query(
        collection(db, 'projects'),
        where('__name__', 'in', batch),
        orderBy('created_at', 'desc')
      );
      const projectsSnapshot = await getDocs(projectsQuery);
      
      const batchProjects = projectsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at?.toDate(),
        updated_at: doc.data().updated_at?.toDate()
      }));
      
      projects.push(...batchProjects);
    }

    // Sort by created_at desc
    projects.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());

    return { data: projects, error: null };
  } catch (error) {
    console.error('Get user projects error:', error);
    return { data: [], error };
  }
};

export const createArticle = async (projectId: string, title: string, content: string) => {
  try {
    const articleData = {
      project_id: projectId,
      title,
      content,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'articles'), articleData);
    
    // Log activity
    await logActivity(projectId, 'created', 'article', docRef.id, { title });

    const article = { id: docRef.id, ...articleData };
    return { data: article, error: null };
  } catch (error) {
    console.error('Create article error:', error);
    return { data: null, error };
  }
};

export const getProjectArticles = async (projectId: string) => {
  try {
    // Use a simpler query without ordering to avoid index requirements
    const articlesQuery = query(
      collection(db, 'articles'),
      where('project_id', '==', projectId)
    );
    const articlesSnapshot = await getDocs(articlesQuery);
    
    let articles = articlesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      created_at: doc.data().created_at?.toDate(),
      updated_at: doc.data().updated_at?.toDate()
    }));

    // Sort articles by updated_at in JavaScript instead of Firestore
    articles = articles.sort((a, b) => {
      const aTime = a.updated_at?.getTime() || 0;
      const bTime = b.updated_at?.getTime() || 0;
      return bTime - aTime; // desc order
    });
    return { data: articles, error: null };
  } catch (error) {
    console.error('Get project articles error:', error);
    return { data: [], error };
  }
};

export const getArticleById = async (articleId: string) => {
  try {
    const articleDoc = await getDoc(doc(db, 'articles', articleId));
    if (articleDoc.exists()) {
      const data = articleDoc.data();
      return {
        data: {
          id: articleDoc.id,
          ...data,
          created_at: data.created_at?.toDate(),
          updated_at: data.updated_at?.toDate()
        },
        error: null
      };
    }
    return { data: null, error: { message: 'Article not found' } };
  } catch (error) {
    console.error('Get article by ID error:', error);
    return { data: null, error };
  }
};

export const updateArticle = async (articleId: string, updates: Partial<Article>) => {
  try {
    const articleRef = doc(db, 'articles', articleId);
    await updateDoc(articleRef, {
      ...updates,
      updated_at: serverTimestamp()
    });

    const updatedDoc = await getDoc(articleRef);
    const article = { 
      id: updatedDoc.id, 
      ...updatedDoc.data(),
      created_at: updatedDoc.data()?.created_at?.toDate(),
      updated_at: updatedDoc.data()?.updated_at?.toDate()
    };
    
    // Log activity
    if (article.project_id) {
      await logActivity(article.project_id, 'updated', 'article', articleId, { title: article.title });
    }

    return { data: article, error: null };
  } catch (error) {
    console.error('Update article error:', error);
    return { data: null, error };
  }
};

// Content Brief operations
export const createContentBrief = async (briefData: Omit<ContentBrief, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const contentBriefData = {
      ...briefData,
      user_id: user.uid,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'content_briefs'), contentBriefData);
    
    // Log activity if project_id exists
    if (briefData.project_id) {
      await logActivity(briefData.project_id, 'created', 'content_brief', docRef.id, { title: briefData.title });
    }

    const brief = { id: docRef.id, ...contentBriefData };
    return { data: brief, error: null };
  } catch (error) {
    console.error('Create content brief error:', error);
    return { data: null, error };
  }
};

export const getUserContentBriefs = async () => {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const briefsQuery = query(
      collection(db, 'content_briefs'),
      where('user_id', '==', user.uid),
      orderBy('updated_at', 'desc')
    );
    const briefsSnapshot = await getDocs(briefsQuery);
    
    const briefs = briefsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      created_at: doc.data().created_at?.toDate(),
      updated_at: doc.data().updated_at?.toDate()
    }));

    return { data: briefs, error: null };
  } catch (error) {
    console.error('Get user content briefs error:', error);
    return { data: [], error };
  }
};

export const updateContentBrief = async (briefId: string, updates: Partial<ContentBrief>) => {
  try {
    const briefRef = doc(db, 'content_briefs', briefId);
    await updateDoc(briefRef, {
      ...updates,
      updated_at: serverTimestamp()
    });

    const updatedDoc = await getDoc(briefRef);
    const brief = { 
      id: updatedDoc.id, 
      ...updatedDoc.data(),
      created_at: updatedDoc.data()?.created_at?.toDate(),
      updated_at: updatedDoc.data()?.updated_at?.toDate()
    };

    return { data: brief, error: null };
  } catch (error) {
    console.error('Update content brief error:', error);
    return { data: null, error };
  }
};

export const deleteContentBrief = async (briefId: string) => {
  try {
    await deleteDoc(doc(db, 'content_briefs', briefId));
    return { data: { id: briefId }, error: null };
  } catch (error) {
    console.error('Delete content brief error:', error);
    return { data: null, error };
  }
};

export const getUserProfile = async () => {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      return { 
        data: {
          ...data,
          created_at: data.created_at?.toDate(),
          updated_at: data.updated_at?.toDate()
        }, 
        error: null 
      };
    }
    
    return { data: null, error: null };
  } catch (error) {
    console.error('Get user profile error:', error);
    return { data: null, error };
  }
};

export const updateUserProfile = async (updates: Partial<UserProfile>) => {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, {
      ...updates,
      updated_at: serverTimestamp()
    });

    const updatedDoc = await getDoc(userRef);
    const profile = { id: updatedDoc.id, ...updatedDoc.data() };
    return { data: profile, error: null };
  } catch (error) {
    console.error('Update user profile error:', error);
    return { data: null, error };
  }
};

// Get user statistics
export const getUserStats = async (): Promise<{ data: UserStats | null; error: any }> => {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    // Get user profile for usage data
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const userData = userDoc.exists() ? userDoc.data() : null;

    // Get team memberships to find projects
    const teamMembersQuery = query(
      collection(db, 'team_members'),
      where('user_id', '==', user.uid),
      where('status', '==', 'active')
    );
    const teamMembersSnapshot = await getDocs(teamMembersQuery);
    const projectIds = teamMembersSnapshot.docs.map(doc => doc.data().project_id);

    // Count projects
    const totalProjects = projectIds.length;

    // Count articles across all user projects
    let totalArticles = 0;
    if (projectIds.length > 0) {
      // Process in batches due to Firestore 'in' query limit
      for (let i = 0; i < projectIds.length; i += 10) {
        const batch = projectIds.slice(i, i + 10);
        const articlesQuery = query(
          collection(db, 'articles'),
          where('project_id', 'in', batch)
        );
        const articlesCount = await getCountFromServer(articlesQuery);
        totalArticles += articlesCount.data().count;
      }
    }

    // Count content briefs
    const briefsQuery = query(
      collection(db, 'content_briefs'),
      where('user_id', '==', user.uid)
    );
    const briefsCount = await getCountFromServer(briefsQuery);
    const totalBriefs = briefsCount.data().count;

    const stats: UserStats = {
      totalProjects,
      totalArticles,
      totalBriefs,
      usageCount: userData?.usage_count || 0,
      usageLimit: userData?.usage_limit || 10
    };

    return { data: stats, error: null };
  } catch (error) {
    console.error('Get user stats error:', error);
    return { data: null, error };
  }
};

// Team collaboration functions
export const getProjectTeamMembers = async (projectId: string) => {
  try {
    // Use simpler query without ordering to avoid index requirements
    const teamMembersQuery = query(
      collection(db, 'team_members'),
      where('project_id', '==', projectId),
      where('status', '==', 'active')
    );
    const teamMembersSnapshot = await getDocs(teamMembersQuery);
    
    let teamMembers = await Promise.all(
      teamMembersSnapshot.docs.map(async (memberDoc) => {
        const memberData = memberDoc.data();
        const userDoc = await getDoc(doc(db, 'users', memberData.user_id));
        const userData = userDoc.exists() ? userDoc.data() : null;
        
        return {
          id: memberDoc.id,
          ...memberData,
          created_at: memberData.created_at?.toDate(),
          updated_at: memberData.updated_at?.toDate(),
          user: userData ? {
            id: userDoc.id,
            email: userData.email,
            full_name: userData.full_name
          } : null
        };
      })
    );

    // Sort team members by created_at in JavaScript instead of Firestore
    teamMembers = teamMembers.sort((a, b) => {
      const aTime = a.created_at?.getTime() || 0;
      const bTime = b.created_at?.getTime() || 0;
      return aTime - bTime; // asc order
    });

    return { data: teamMembers, error: null };
  } catch (error) {
    console.error('Get team members error:', error);
    return { data: [], error };
  }
};

export const inviteTeamMember = async (projectId: string, email: string, role: 'admin' | 'editor' | 'viewer') => {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    // Check if current user has permission to invite
    const currentUserMemberQuery = query(
      collection(db, 'team_members'),
      where('project_id', '==', projectId),
      where('user_id', '==', user.uid),
      where('status', '==', 'active')
    );
    const currentUserMemberSnapshot = await getDocs(currentUserMemberQuery);
    
    if (currentUserMemberSnapshot.empty) {
      return { error: { message: 'You are not a member of this project' } };
    }
    
    const currentUserRole = currentUserMemberSnapshot.docs[0].data().role;
    if (!['owner', 'admin'].includes(currentUserRole)) {
      return { error: { message: 'You do not have permission to invite team members' } };
    }
    
    // Check if invitation already exists
    const existingInviteQuery = query(
      collection(db, 'project_invitations'),
      where('project_id', '==', projectId),
      where('email', '==', email),
      where('accepted_at', '==', null)
    );
    const existingInviteSnapshot = await getDocs(existingInviteQuery);
    
    if (!existingInviteSnapshot.empty) {
      return { error: { message: 'Invitation already sent to this email' } };
    }

    // Check if user with this email already exists as team member
    const usersQuery = query(
      collection(db, 'users'),
      where('email', '==', email)
    );
    const usersSnapshot = await getDocs(usersQuery);
    
    if (!usersSnapshot.empty) {
      const existingUser = usersSnapshot.docs[0];
      const existingTeamMemberQuery = query(
        collection(db, 'team_members'),
        where('project_id', '==', projectId),
        where('user_id', '==', existingUser.id),
        where('status', '==', 'active')
      );
      const existingTeamMemberSnapshot = await getDocs(existingTeamMemberQuery);
      
      if (!existingTeamMemberSnapshot.empty) {
        return { error: { message: 'User is already a team member' } };
      }
    }

    const invitationData = {
      project_id: projectId,
      email,
      role,
      invited_by: user.uid,
      token: generateInviteToken(),
      expires_at: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)), // 7 days
      created_at: serverTimestamp()
    };

    // Create invitation in project_invitations collection
    const inviteRef = await addDoc(collection(db, 'project_invitations'), invitationData);
    
    // Log activity
    await logActivity(projectId, 'invited', 'team_member', null, { email, role });

    const invitation = { id: inviteRef.id, ...invitationData };
    return { data: invitation, error: null };
  } catch (error) {
    console.error('Invite team member error:', error);
    return { data: null, error };
  }
};

export const removeTeamMember = async (projectId: string, userId: string) => {
  try {
    const teamMemberQuery = query(
      collection(db, 'team_members'),
      where('project_id', '==', projectId),
      where('user_id', '==', userId)
    );
    const teamMemberSnapshot = await getDocs(teamMemberQuery);
    
    if (!teamMemberSnapshot.empty) {
      const memberDoc = teamMemberSnapshot.docs[0];
      await updateDoc(memberDoc.ref, {
        status: 'inactive',
        updated_at: serverTimestamp()
      });
      
      // Log activity
      await logActivity(projectId, 'removed', 'team_member', userId);
      
      return { data: { id: memberDoc.id }, error: null };
    }
    
    return { data: null, error: { message: 'Team member not found' } };
  } catch (error) {
    console.error('Remove team member error:', error);
    return { data: null, error };
  }
};

export const updateTeamMemberRole = async (projectId: string, userId: string, role: 'admin' | 'editor' | 'viewer') => {
  try {
    const teamMemberQuery = query(
      collection(db, 'team_members'),
      where('project_id', '==', projectId),
      where('user_id', '==', userId)
    );
    const teamMemberSnapshot = await getDocs(teamMemberQuery);
    
    if (!teamMemberSnapshot.empty) {
      const memberDoc = teamMemberSnapshot.docs[0];
      await updateDoc(memberDoc.ref, {
        role,
        updated_at: serverTimestamp()
      });
      
      // Log activity
      await logActivity(projectId, 'role_updated', 'team_member', userId, { new_role: role });
      
      return { data: { id: memberDoc.id }, error: null };
    }
    
    return { data: null, error: { message: 'Team member not found' } };
  } catch (error) {
    console.error('Update team member role error:', error);
    return { data: null, error };
  }
};

export const getProjectInvitations = async (projectId: string) => {
  try {
    // Use simpler query without ordering to avoid index requirements
    const invitationsQuery = query(
      collection(db, 'project_invitations'),
      where('project_id', '==', projectId)
    );
    const invitationsSnapshot = await getDocs(invitationsQuery);
    
    let invitations = invitationsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        expires_at: data.expires_at?.toDate() || new Date(),
        created_at: data.created_at?.toDate() || new Date()
      };
    }).filter(invitation => !invitation.accepted_at); // Filter pending invitations (where accepted_at is falsy)
    
    // Sort by created_at desc in JavaScript
    invitations = invitations.sort((a, b) => {
      const aTime = a.created_at?.getTime() || 0;
      const bTime = b.created_at?.getTime() || 0;
      return bTime - aTime;
    });

    return { data: invitations, error: null };
  } catch (error) {
    console.error('Get project invitations error:', error);
    return { data: [], error };
  }
};

export const cancelInvitation = async (invitationId: string) => {
  try {
    await deleteDoc(doc(db, 'project_invitations', invitationId));
    return { data: { id: invitationId }, error: null };
  } catch (error) {
    console.error('Cancel invitation error:', error);
    return { data: null, error };
  }
};

// Accept invitation functions
export const getUserInvitations = async () => {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    // Get all invitations for the current user's email from project_invitations collection
    const invitationsQuery = query(
      collection(db, 'project_invitations'),
      where('email', '==', user.email)
    );
    const invitationsSnapshot = await getDocs(invitationsQuery);
    
    let invitations = await Promise.all(
      invitationsSnapshot.docs.map(async (inviteDoc) => {
        const inviteData = inviteDoc.data();
        
        // Get project details
        const projectDoc = await getDoc(doc(db, 'projects', inviteData.project_id));
        const projectData = projectDoc.exists() ? projectDoc.data() : null;
        
        // Get inviter details
        const inviterDoc = await getDoc(doc(db, 'users', inviteData.invited_by));
        const inviterData = inviterDoc.exists() ? inviterDoc.data() : null;
        
        return {
          id: inviteDoc.id,
          ...inviteData,
          expires_at: inviteData.expires_at?.toDate() || new Date(),
          created_at: inviteData.created_at?.toDate() || new Date(),
          project: projectData ? {
            id: projectDoc.id,
            title: projectData.title,
            description: projectData.description
          } : null,
          inviter: inviterData ? {
            id: inviterDoc.id,
            email: inviterData.email,
            full_name: inviterData.full_name
          } : null
        };
      })
    );

    // Filter pending and non-expired invitations in JavaScript
    invitations = invitations.filter(invitation => 
      !invitation.accepted_at && invitation.expires_at > new Date()
    );

    // Sort by created_at desc in JavaScript
    invitations = invitations.sort((a, b) => {
      const aTime = a.created_at?.getTime() || 0;
      const bTime = b.created_at?.getTime() || 0;
      return bTime - aTime;
    });

    return { data: invitations, error: null };
  } catch (error) {
    console.error('Get user invitations error:', error);
    return { data: [], error };
  }
};

export const acceptInvitation = async (invitationId: string) => {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    // Get the invitation from project_invitations
    const inviteDoc = await getDoc(doc(db, 'project_invitations', invitationId));
    if (!inviteDoc.exists()) {
      return { error: { message: 'Invitation not found' } };
    }

    const inviteData = inviteDoc.data();
    
    // Check if invitation is still valid
    if (inviteData.expires_at?.toDate() < new Date()) {
      return { error: { message: 'Invitation has expired' } };
    }

    // Check if user email matches invitation email
    if (inviteData.email !== user.email) {
      return { error: { message: 'This invitation is not for your email address' } };
    }

    // Check if user is already a team member
    const existingMemberQuery = query(
      collection(db, 'team_members'),
      where('project_id', '==', inviteData.project_id),
      where('user_id', '==', user.uid),
      where('status', '==', 'active')
    );
    const existingMemberSnapshot = await getDocs(existingMemberQuery);
    
    if (!existingMemberSnapshot.empty) {
      return { error: { message: 'You are already a member of this project' } };
    }

    // Add user as team member
    await addDoc(collection(db, 'team_members'), {
      user_id: user.uid,
      project_id: inviteData.project_id,
      role: inviteData.role,
      invited_by: inviteData.invited_by,
      status: 'active',
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    });

    // Mark invitation as accepted in project_invitations
    await updateDoc(doc(db, 'project_invitations', invitationId), {
      accepted_at: serverTimestamp()
    });

    // Log activity
    await logActivity(inviteData.project_id, 'joined', 'team_member', user.uid, { 
      role: inviteData.role,
      email: user.email 
    });

    return { data: { success: true }, error: null };
  } catch (error) {
    console.error('Accept invitation error:', error);
    return { data: null, error };
  }
};

export const declineInvitation = async (invitationId: string) => {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    // Get the invitation from project_invitations to verify it belongs to the user
    const inviteDoc = await getDoc(doc(db, 'project_invitations', invitationId));
    if (!inviteDoc.exists()) {
      return { error: { message: 'Invitation not found' } };
    }

    const inviteData = inviteDoc.data();
    
    // Check if user email matches invitation email
    if (inviteData.email !== user.email) {
      return { error: { message: 'This invitation is not for your email address' } };
    }

    // Delete the invitation from project_invitations
    await deleteDoc(doc(db, 'project_invitations', invitationId));

    return { data: { success: true }, error: null };
  } catch (error) {
    console.error('Decline invitation error:', error);
    return { data: null, error };
  }
};

// Comments functions
export const getArticleComments = async (articleId: string) => {
  try {
    const commentsQuery = query(
      collection(db, 'article_comments'),
      where('article_id', '==', articleId),
      orderBy('created_at', 'asc')
    );
    const commentsSnapshot = await getDocs(commentsQuery);
    
    const comments = await Promise.all(
      commentsSnapshot.docs.map(async (commentDoc) => {
        const commentData = commentDoc.data();
        const userDoc = await getDoc(doc(db, 'users', commentData.user_id));
        const userData = userDoc.exists() ? userDoc.data() : null;
        
        return {
          id: commentDoc.id,
          ...commentData,
          created_at: commentData.created_at?.toDate(),
          updated_at: commentData.updated_at?.toDate(),
          user: userData ? {
            id: userDoc.id,
            email: userData.email,
            full_name: userData.full_name
          } : null
        };
      })
    );

    return { data: comments, error: null };
  } catch (error) {
    console.error('Get article comments error:', error);
    return { data: [], error };
  }
};

export const createComment = async (articleId: string, content: string, position?: any) => {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const commentData = {
      article_id: articleId,
      user_id: user.uid,
      content,
      position: position || null,
      resolved: false,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'article_comments'), commentData);
    
    // Get user data for response
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const userData = userDoc.exists() ? userDoc.data() : null;
    
    const comment = {
      id: docRef.id,
      ...commentData,
      user: userData ? {
        id: user.uid,
        email: userData.email,
        full_name: userData.full_name
      } : null
    };

    return { data: comment, error: null };
  } catch (error) {
    console.error('Create comment error:', error);
    return { data: null, error };
  }
};

export const updateComment = async (commentId: string, content: string) => {
  try {
    const commentRef = doc(db, 'article_comments', commentId);
    await updateDoc(commentRef, {
      content,
      updated_at: serverTimestamp()
    });

    const updatedDoc = await getDoc(commentRef);
    const commentData = updatedDoc.data();
    
    // Get user data
    const userDoc = await getDoc(doc(db, 'users', commentData?.user_id));
    const userData = userDoc.exists() ? userDoc.data() : null;
    
    const comment = {
      id: updatedDoc.id,
      ...commentData,
      created_at: commentData?.created_at?.toDate(),
      updated_at: commentData?.updated_at?.toDate(),
      user: userData ? {
        id: userDoc.id,
        email: userData.email,
        full_name: userData.full_name
      } : null
    };

    return { data: comment, error: null };
  } catch (error) {
    console.error('Update comment error:', error);
    return { data: null, error };
  }
};

export const resolveComment = async (commentId: string, resolved: boolean = true) => {
  try {
    const commentRef = doc(db, 'article_comments', commentId);
    await updateDoc(commentRef, { resolved });
    return { data: { id: commentId }, error: null };
  } catch (error) {
    console.error('Resolve comment error:', error);
    return { data: null, error };
  }
};

export const deleteComment = async (commentId: string) => {
  try {
    await deleteDoc(doc(db, 'article_comments', commentId));
    return { data: { id: commentId }, error: null };
  } catch (error) {
    console.error('Delete comment error:', error);
    return { data: null, error };
  }
};

// Activity functions
export const getProjectActivity = async (projectId: string, limitCount: number = 50) => {
  try {
    // Use simpler query without ordering to avoid index requirements
    const activityQuery = query(
      collection(db, 'activity_logs'),
      where('project_id', '==', projectId)
    );
    const activitySnapshot = await getDocs(activityQuery);
    
    let activities = await Promise.all(
      activitySnapshot.docs.map(async (activityDoc) => {
        const activityData = activityDoc.data();
        const userDoc = await getDoc(doc(db, 'users', activityData.user_id));
        const userData = userDoc.exists() ? userDoc.data() : null;
        
        return {
          id: activityDoc.id,
          ...activityData,
          created_at: activityData.created_at?.toDate(),
          user: userData ? {
            id: userDoc.id,
            email: userData.email,
            full_name: userData.full_name
          } : null
        };
      })
    );

    // Sort activities by created_at in JavaScript instead of Firestore
    activities = activities.sort((a, b) => {
      const aTime = a.created_at?.getTime() || 0;
      const bTime = b.created_at?.getTime() || 0;
      return bTime - aTime; // desc order
    });

    // Apply limit in JavaScript
    activities = activities.slice(0, limitCount);

    return { data: activities, error: null };
  } catch (error) {
    console.error('Get project activity error:', error);
    return { data: [], error };
  }
};

// Check user permissions
export const getUserProjectRole = async (projectId: string) => {
  try {
    const user = getCurrentUser();
    if (!user) return null;

    const teamMemberQuery = query(
      collection(db, 'team_members'),
      where('project_id', '==', projectId),
      where('user_id', '==', user.uid),
      where('status', '==', 'active')
    );
    const teamMemberSnapshot = await getDocs(teamMemberQuery);
    
    if (!teamMemberSnapshot.empty) {
      return teamMemberSnapshot.docs[0].data().role;
    }
    
    return null;
  } catch (error) {
    console.error('Get user project role error:', error);
    return null;
  }
};

export const canUserEditProject = async (projectId: string) => {
  const role = await getUserProjectRole(projectId);
  return role && ['owner', 'admin', 'editor'].includes(role);
};

export const canUserManageTeam = async (projectId: string) => {
  const role = await getUserProjectRole(projectId);
  return role && ['owner', 'admin'].includes(role);
};

// Increment usage count for AI features
export const incrementUsageCount = async () => {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, {
      usage_count: increment(1),
      updated_at: serverTimestamp()
    });

    const updatedDoc = await getDoc(userRef);
    const profile = { id: updatedDoc.id, ...updatedDoc.data() };
    return { data: profile, error: null };
  } catch (error) {
    console.error('Increment usage count error:', error);
    return { data: null, error };
  }
};

// Helper functions
const generateInviteToken = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

const logActivity = async (projectId: string, action: string, resourceType: string, resourceId?: string, metadata: any = {}) => {
  try {
    const user = getCurrentUser();
    if (!user) return;

    await addDoc(collection(db, 'activity_logs'), {
      project_id: projectId,
      user_id: user.uid,
      action,
      resource_type: resourceType,
      resource_id: resourceId || null,
      metadata,
      created_at: serverTimestamp()
    });
  } catch (error) {
    console.warn('Failed to log activity:', error);
  }
};

// Auth state listener
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};