import { PrismaClient, TelegramUser } from "@prisma/client";

export const getTelegramUserByID = async (
  prisma: PrismaClient,
  id: number,
): Promise<TelegramUser | null> => {
  return prisma.telegramUser.findFirst({
    where: {
      id,
    },
  });
};

export const registerTelegramUser = async (
  prisma: PrismaClient,
  userRequest: {
    id: number;
    username?: string;
    name: string;
    verified: boolean;
    banned: boolean;
  },
): Promise<{
  success: boolean;
  errorMessage: string;
  user: TelegramUser | null;
}> => {
  try {
    const user = await prisma.telegramUser.create({
      data: {
        id: userRequest.id,
        username: userRequest.username,
        name: userRequest.name,
        isVerified: userRequest.verified,
        isBanned: userRequest.banned,
      },
    });

    return {
      success: true,
      errorMessage: "",
      user: user,
    };
  } catch (error: any) {
    return {
      success: true,
      errorMessage: error.message,
      user: null,
    };
  }
};
