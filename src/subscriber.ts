import { Prisma, PrismaClient, Subscriber } from "@prisma/client";

export const getSubscribedList = async (
  prisma: PrismaClient,
): Promise<Subscriber[]> => {
  return prisma.subscriber.findMany({});
};

export const getSubscriberByChatID = async (
  prisma: PrismaClient,
  chatID: number,
): Promise<Subscriber | null> => {
  return prisma.subscriber.findFirst({
    where: {
      chatID,
    },
  });
};

export const subscribe = async (
  prisma: PrismaClient,
  subscriber: Prisma.SubscriberCreateInput,
): Promise<[boolean, string]> => {
  try {
    await prisma.subscriber.create({
      data: {
        chatID: subscriber.chatID,
        username: subscriber.username,
        name: subscriber.name,
        type: subscriber.type,
      },
    });

    return [true, ""];
  } catch (error) {
    return [false, error.message];
  }
};

export const unsubscribe = async (
  prisma: PrismaClient,
  subscriber: Subscriber,
): Promise<[boolean, string]> => {
  try {
    await prisma.subscriber.delete({
      where: {
        id: subscriber.id,
      },
    });

    return [true, ""];
  } catch (error) {
    return [false, error.message];
  }
};
