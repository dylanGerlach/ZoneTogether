import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type {
  AuthSession,
  MembershipRole,
  OrganizationMembership,
  OrganizationUser,
  UUID,
} from "../types";
import { fetchOrganizationUsers, fetchOrganizations } from "../utils/backendApi";

type OrganizationContextValue = {
  organizations: OrganizationMembership[];
  organizationsLoading: boolean;
  organizationsError: string | null;
  organizationUsersByOrg: Record<UUID, OrganizationUser[]>;
  organizationUsersLoadingByOrg: Record<UUID, boolean>;
  organizationUsersErrorByOrg: Record<UUID, string | null>;
  loadOrganizations: (session: AuthSession) => Promise<OrganizationMembership[]>;
  loadOrganizationUsers: (
    session: AuthSession,
    organizationId: UUID,
  ) => Promise<OrganizationUser[]>;
  invalidateOrganization: (organizationId: UUID) => void;
  invalidateAll: () => void;
  getOrganization: (organizationId: UUID) => OrganizationMembership | null;
  getOrganizationUsers: (organizationId: UUID) => OrganizationUser[];
  getRole: (organizationId: UUID) => MembershipRole | null;
};

const OrganizationContext = createContext<OrganizationContextValue | undefined>(undefined);

export const OrganizationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [organizations, setOrganizations] = useState<OrganizationMembership[]>([]);
  const [organizationsLoading, setOrganizationsLoading] = useState(false);
  const [organizationsError, setOrganizationsError] = useState<string | null>(null);

  const [organizationUsersByOrg, setOrganizationUsersByOrg] = useState<
    Record<UUID, OrganizationUser[]>
  >({});
  const [organizationUsersLoadingByOrg, setOrganizationUsersLoadingByOrg] = useState<
    Record<UUID, boolean>
  >({});
  const [organizationUsersErrorByOrg, setOrganizationUsersErrorByOrg] = useState<
    Record<UUID, string | null>
  >({});

  const loadOrganizations = useCallback(async (session: AuthSession) => {
    setOrganizationsLoading(true);
    setOrganizationsError(null);
    try {
      const response = await fetchOrganizations(session);
      setOrganizations(response.organizations);
      return response.organizations;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to load organizations.";
      setOrganizationsError(message);
      return [];
    } finally {
      setOrganizationsLoading(false);
    }
  }, []);

  const loadOrganizationUsers = useCallback(
    async (session: AuthSession, organizationId: UUID) => {
      setOrganizationUsersLoadingByOrg((previous) => ({
        ...previous,
        [organizationId]: true,
      }));
      setOrganizationUsersErrorByOrg((previous) => ({
        ...previous,
        [organizationId]: null,
      }));
      try {
        const users = await fetchOrganizationUsers(session, organizationId);
        setOrganizationUsersByOrg((previous) => ({
          ...previous,
          [organizationId]: users,
        }));
        return users;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to load organization members.";
        setOrganizationUsersErrorByOrg((previous) => ({
          ...previous,
          [organizationId]: message,
        }));
        return [];
      } finally {
        setOrganizationUsersLoadingByOrg((previous) => ({
          ...previous,
          [organizationId]: false,
        }));
      }
    },
    [],
  );

  const invalidateOrganization = useCallback((organizationId: UUID) => {
    setOrganizationUsersByOrg((previous) => {
      const { [organizationId]: _removed, ...rest } = previous;
      return rest;
    });
    setOrganizationUsersErrorByOrg((previous) => ({
      ...previous,
      [organizationId]: null,
    }));
  }, []);

  const invalidateAll = useCallback(() => {
    setOrganizations([]);
    setOrganizationsError(null);
    setOrganizationUsersByOrg({});
    setOrganizationUsersLoadingByOrg({});
    setOrganizationUsersErrorByOrg({});
  }, []);

  const getOrganization = useCallback(
    (organizationId: UUID) =>
      organizations.find((membership) => membership.organization_id === organizationId) ?? null,
    [organizations],
  );

  const getOrganizationUsers = useCallback(
    (organizationId: UUID) => organizationUsersByOrg[organizationId] ?? [],
    [organizationUsersByOrg],
  );

  const getRole = useCallback(
    (organizationId: UUID) =>
      organizations.find((membership) => membership.organization_id === organizationId)?.role ??
      null,
    [organizations],
  );

  const value = useMemo<OrganizationContextValue>(
    () => ({
      organizations,
      organizationsLoading,
      organizationsError,
      organizationUsersByOrg,
      organizationUsersLoadingByOrg,
      organizationUsersErrorByOrg,
      loadOrganizations,
      loadOrganizationUsers,
      invalidateOrganization,
      invalidateAll,
      getOrganization,
      getOrganizationUsers,
      getRole,
    }),
    [
      organizations,
      organizationsLoading,
      organizationsError,
      organizationUsersByOrg,
      organizationUsersLoadingByOrg,
      organizationUsersErrorByOrg,
      loadOrganizations,
      loadOrganizationUsers,
      invalidateOrganization,
      invalidateAll,
      getOrganization,
      getOrganizationUsers,
      getRole,
    ],
  );

  return (
    <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>
  );
};

export function useOrganizationContext(): OrganizationContextValue {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error("useOrganizationContext must be used within an OrganizationProvider");
  }
  return context;
}
