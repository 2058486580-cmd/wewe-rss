import { FC, useMemo } from 'react';
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  getKeyValue,
  Button,
  Spinner,
  Link,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from '@nextui-org/react';
import { trpc } from '@web/utils/trpc';
import dayjs from 'dayjs';
import ArticleViewer from '@web/components/ArticleViewer';
import { useParams } from 'react-router-dom';

import { FC, useMemo, useState } from 'react';
const ArticleList: FC = () => {
  const { id } = useParams();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);

  const mpId = id || '';

  const { data, fetchNextPage, isLoading, hasNextPage } =
    trpc.article.list.useInfiniteQuery(
      {
        limit: 20,
        mpId: mpId,
      },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
      },
    );

  const items = useMemo(() => {
    const items = data
      ? data.pages.reduce((acc, page) => [...acc, ...page.items], [] as any[])
      : [];

    return items;
  }, [data]);

  return (
    <div>
      <Table
        classNames={{
          base: 'h-full',
          table: 'min-h-[420px]',
        }}
        aria-label="文章列表"
        onRowAction={(key) => {
          setSelectedArticleId(key as string);
          onOpen();
        }}
        bottomContent={
          hasNextPage && !isLoading ? (
            <div className="flex w-full justify-center">
              <Button
                isDisabled={isLoading}
                variant="flat"
                onPress={() => {
                  fetchNextPage();
                }}
              >
                {isLoading && <Spinner color="white" size="sm" />}
                加载更多
              </Button>
            </div>
          ) : null
        }
      >
        <TableHeader>
          <TableColumn key="title">标题</TableColumn>
          <TableColumn width={180} key="publishTime">
            发布时间
          </TableColumn>
        </TableHeader>
        <TableBody
          isLoading={isLoading}
          emptyContent={'暂无数据'}
          items={items || []}
          loadingContent={<Spinner />}
        >
          {(item) => (
            <TableRow key={item.id}>
              {(columnKey) => {
                let value = getKeyValue(item, columnKey);

                if (columnKey === 'publishTime') {
                  value = dayjs(value * 1e3).format('YYYY-MM-DD HH:mm:ss');
                  return <TableCell>{value}</TableCell>;
                }

                if (columnKey === 'title') {
                  return (
                    <TableCell>
                      <Link
                        className="visited:text-neutral-400"
                        isBlock
                        showAnchorIcon
                        color="foreground"
                        target="_blank"
                        href={`https://mp.weixin.qq.com/s/${item.id}`}
                      >
                        {value}
                      </Link>
                    </TableCell>
                  );
                }
                return <TableCell>{value}</TableCell>;
              }}
            </TableRow>
          )}
        </TableBody>
      </Table>
      <Modal isOpen={isOpen} onClose={onClose} size="5xl" scrollBehavior="inside">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">Article</ModalHeader>
              <ModalBody>
                {selectedArticleId && <ArticleViewer articleId={selectedArticleId} />}
              </ModalBody>
              <ModalFooter>
                <Button color="primary" onPress={onClose}>
                  Close
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

export default ArticleList;
